# LGPD, segurança e recursos de chamados — o que foi feito e como ativar

Este documento acompanha as migrações `20261004100000_lgpd_seguranca.sql` e
`20261004110000_recursos_chamados.sql` e as funções de borda novas/alteradas.
O app já está preparado no código; **as mudanças de banco e funções precisam
ser aplicadas no projeto Supabase de produção** (o MCP do Supabase desta conta
não aponta para o backend real — ver `CLAUDE.md`).

> Este material descreve medidas técnicas. A conformidade com a LGPD também
> depende de medidas organizacionais (lista no fim) — vale validar com o
> jurídico/encarregado de dados.

---

## 1. Passo a passo de ativação (produção)

1. **Aplicar as migrações**, na ordem, no SQL Editor do Supabase (ou `supabase db push`):
   1. `supabase/migrations/20261004100000_lgpd_seguranca.sql`
   2. `supabase/migrations/20261004110000_recursos_chamados.sql`

   As duas são idempotentes (podem ser executadas de novo sem efeito colateral).
2. **Publicar as funções de borda** (Supabase CLI):
   ```bash
   supabase functions deploy lgpd-retencao relatorio-agendado automacoes push-dispatch \
     backup-export forgot-password change-password-secure send-email
   ```
3. **Verificação em duas etapas (MFA/TOTP):** Authentication › Multi-Factor →
   deixe *TOTP* habilitado (é o padrão no Supabase Cloud). Em Privacidade ›
   Retenção e segurança, ligue "Exigir verificação em duas etapas de Admin/Master"
   quando todos os administradores tiverem configurado.
4. **Bloqueio após senhas erradas:** Authentication › Hooks › *Password Verification
   Attempt* → `public.hook_password_verification_attempt` (5 erros = 15 min de bloqueio;
   desbloqueio manual em Usuários › "Desbloquear login"). *Disponível conforme o plano do Supabase.*
5. **Agendamentos:**
   - Se o projeto tiver a extensão **pg_cron**, as migrações já agendam:
     `lgpd-retencao-diaria` (03:30) e `chamados-automacoes` (a cada 10 min).
   - Sem pg_cron: em Edge Functions › Schedules, agende a função **`automacoes`** a cada
     10 minutos com o header `Authorization: Bearer <service_role key>` (ela roda as
     automações, a retenção às 3h e o relatório por e-mail no dia certo).
6. **Notificações push (opcional):**
   - Gere as chaves VAPID: `npx web-push generate-vapid-keys`.
   - Secrets das funções: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
     `VAPID_SUBJECT=mailto:ti@suaempresa.com`, `PUSH_WEBHOOK_SECRET=<texto aleatório>`.
   - No `.env` do app: `VITE_VAPID_PUBLIC_KEY=<chave pública>` e refaça o build.
   - Database › Webhooks: tabela `notificacoes`, evento *Insert*, destino a função
     `push-dispatch`, header `x-webhook-secret: <PUSH_WEBHOOK_SECRET>`.
7. **Reconstruir/publicar o app** (Docker/nginx). O `nginx.conf` agora envia cabeçalhos de
   segurança (CSP, HSTS, X-Frame-Options etc.).
8. **Preencher o Aviso de privacidade** em Privacidade › Aviso de privacidade (encarregado/DPO,
   e-mail, texto) e clicar em *Publicar nova versão* — todos registram ciência no próximo acesso.

---

## 2. Inventário — o que cada item resolve

### Correções de segurança encontradas no código
| Problema | Correção |
|---|---|
| Anexos de chamados em bucket **público** (qualquer pessoa com o link via o arquivo, para sempre) | Bucket `chamados_anexos` privado; abertura por link temporário de 5 min; leitura só para quem pode ver o chamado/comentário (`can_access_anexo`). Links antigos gravados no banco foram convertidos para caminho interno. |
| Usuário comum conseguia **se promover a Admin/Master** pela API (política `profiles_self_all`) | Gatilho `protect_profile_privileges`: só Admin/Master alteram papel, acesso, setor e e-mail; só Master concede Master. |
| Regra de anexos dava acesso a **qualquer colega do mesmo departamento** | A regra de departamento agora vale só para a equipe técnica (igual à política de chamados). |
| Botão "Autenticação de Dois Fatores" em Configurações **não fazia nada** | MFA TOTP real (perfil, login com código, exigência para admins). |
| Auditoria gravava **e-mail, telefone e descrições em claro** e para sempre | `lgpd_redigir()` troca campos pessoais por impressão digital `[protegido:xxxx]` (mostra que mudou, sem expor); dados antigos já foram redigidos; retenção configurável. |
| Backup exportava todos os dados pessoais em arquivo aberto | Arquivo criptografado no navegador (AES-256-GCM, senha ≥ 10 caracteres); exportação exige 2ª etapa quando o Master tem 2FA; registro na auditoria. |
| "Esqueci minha senha" trocava a senha de qualquer e-mail sem limite (dava para bloquear alguém em loop) e usava `Math.random` | Limite de 3 pedidos/hora por e-mail e 10 por IP (resposta sempre genérica) e gerador criptográfico. |
| Política de senha só era checada no navegador | `change-password-secure` aplica a mesma política no servidor. |
| `send-email` deixava qualquer usuário logado enviar e-mail para qualquer endereço usando o SMTP da empresa | Usuário comum só envia para e-mails cadastrados; SMTP personalizado só para Admin. |
| Notificações internas não tinham política de INSERT (falhavam em silêncio) | Política: equipe técnica notifica qualquer um; demais só participantes dos próprios chamados. |
| Sem cabeçalhos de segurança no nginx | CSP sem `unsafe-inline` para scripts (script inline movido para `branding-boot.js`), HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy. |

### Direitos do titular (art. 18)
- **Meu perfil › Privacidade e meus dados:** baixar meus dados (JSON), abrir solicitação
  (acesso, correção, anonimização, eliminação, portabilidade, compartilhamento, revogação,
  oposição), acompanhar protocolo/prazo/resposta e ver **quem acessou meus dados**.
- **Privacidade › Solicitações (Admin/Master):** fila com prazo de 15 dias, alerta de atraso,
  resposta com notificação ao titular.
- **Anonimização** (Usuários › "Anonimizar (LGPD)"): remove nome, contato, foto e acesso
  (login bloqueado), mantém o histórico dos chamados sem identificar; opcionalmente apaga o
  texto/anexos escritos pela pessoa. Irreversível; exige digitar ANONIMIZAR.

### Minimização, controle de acesso e registro
- **Chamado com dado sensível** (formulário, detalhe): visível só a solicitante, responsável e
  Admin/Master — reforçado por política RESTRICTIVE no banco.
- **Contato mascarado** em Usuários para quem não é Admin; "mostrar" fica registrado.
- **Registro de acessos** (`lgpd_acessos`, art. 37): abrir anexo, cadastro, contato completo ou
  chamado sensível de outra pessoa.
- **Tabelas de LGPD** só são lidas por Admin/Master **com a 2ª etapa cumprida** quando há 2FA
  (`is_admin_seguro()`).

### Retenção (Privacidade › Retenção e segurança)
Padrões (editáveis): texto de chamados encerrados anonimizado após 5 anos (título, datas e
métricas permanecem); anexos de chamados encerrados apagados após 2 anos; logs de auditoria após
1 ano; registros de acesso após 2 anos. Execução diária e botão "Aplicar agora" (Master).

### Incidentes (Privacidade › Incidentes)
Registro com severidade, dados e titulares afetados, medidas e datas de comunicação; alerta
quando passa de 3 dias úteis sem comunicar a ANPD (Resolução CD/ANPD nº 15/2024).

### Aviso de privacidade
Link na tela de login, ciência obrigatória a cada nova versão (`lgpd_aceites` guarda versão,
data e navegador), encarregado (DPO) exibido.

---

## 3. Recursos novos de chamados
- **Nota interna** (só equipe técnica — reforçado no banco; não notifica o solicitante).
- **Histórico de eventos** na linha do tempo (status, responsável, prioridade, categoria,
  dado sensível, SLA vencido, encerramento automático).
- **Favoritos** (estrela no detalhe; aba "Favoritos").
- **Ações em massa:** atribuir e mudar prioridade de vários chamados (além de excluir, Master).
- **Avaliação do atendimento** (1–5 estrelas + comentário) pelo solicitante após o encerramento;
  média no Painel e no relatório.
- **Categorias de serviço** (Configurações › Categorias): SLA próprio (tem prioridade sobre o da
  prioridade), prioridade e responsável padrão, campos extras no formulário (texto, número, data,
  lista; obrigatórios ou não).
- **Automações** (Configurações › Automações): atribuição automática por menor carga, aviso de SLA
  vencido ao responsável e admins, encerramento de chamados parados aguardando o usuário.
- **Respostas prontas** (Configurações › Respostas prontas; no chamado: digite `/`).
- **Relatório por e-mail** semanal/mensal para gestores.
- **Notificações push** no celular/computador (PWA), ativadas por dispositivo em Meu perfil.

---

## 4. Medidas organizacionais (fora do sistema)
- Nomear e divulgar o **encarregado (DPO)** — preencher em Privacidade › Aviso de privacidade.
- Manter o **registro das operações de tratamento** (inventário de dados: quais dados, finalidade,
  base legal, compartilhamento, prazo).
- Contrato/termos com o **Supabase** (operador) e verificar a **região** do banco — fora do Brasil
  caracteriza transferência internacional (art. 33).
- Treinar a equipe técnica (anexos e notas podem conter dados sensíveis).
- Plano de resposta a incidentes (quem decide, quem comunica a ANPD/titulares).
- Revisar periodicamente quem tem perfil Admin/Master.

---

## 5. Testes executados
- Migrações aplicadas duas vezes seguidas sobre um Postgres 16 local com todas as migrações
  anteriores (idempotência).
- 36 verificações de LGPD/segurança com usuários simulados (RLS real): sensível, anexos,
  upload em pasta alheia, redação da auditoria, exportação, registro de acesso, solicitações,
  exigência de 2FA, anonimização, bloqueio de login, retenção, autopromoção a Admin/Master.
- 18 verificações dos recursos: categoria (SLA e responsável), atribuição automática, nota
  interna, favoritos, avaliação, notificações, automações (idempotentes), respostas prontas.
- Teste unitário da criptografia do backup; `tsc`, lint (sem erros novos) e build.
