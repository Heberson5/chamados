## Plano de implementação

São 6 frentes distintas. Vou executar em sequência, mas confirme antes para evitar retrabalho — algumas afetam regras críticas (transferência de chamado, gatilhos de e-mail).

### 1. Sidebar – só ícone de tema (UserMenu)
- Mover o botão de troca de tema do `Sidebar.tsx` para dentro do `UserMenu` como um `DropdownMenuItem` logo abaixo de "Trocar Senha".
- Mostrar apenas o ícone (Sun/Moon/Monitor) + tooltip; ciclar entre claro/escuro/automático.

### 2. Auditoria – filtro de período
- Adicionar `DateRangePicker` (Popover + Calendar `mode="range"`) em `Audit.tsx`.
- Padrão = hoje (00:00 → 23:59). Botões rápidos: Hoje, 7d, 30d, Limpar.
- Filtrar `created_at` no fetch.

### 3. Permissões – corrigir edição
- Bug: `upsert` sem `onConflict` falha quando `id` existe porque PostgREST não detecta conflito. Trocar para fluxo explícito: se `selectedRole.id` → `update().eq('id', id)`; senão → `insert()`.
- Adicionar `select().single()` para retornar o registro e tratar erro silencioso (`if (data)` ignora erro).

### 4. Relatórios – modernizar + transferências
- Novo layout responsivo: cards KPI (total, abertos, encerrados, SLA violado, tempo médio de atendimento, taxa de reabertura).
- Filtros de período + departamento + técnico.
- Gráficos adicionais: chamados por dia (linha), por departamento, por categoria, evolução SLA.
- **Nova seção "Transferências"**: tabela + gráfico — total de transferências por técnico (origem/destino), por departamento, e tempo médio que o chamado ficou com o técnico anterior antes da transferência (calculado de `transferencias_chamado.transferido_em` − `chamado.atendido_em` ou `transferencia` anterior).

### 5. Transferência de chamados
- Frontend (`Chamados.tsx` / detalhe): botão "Transferir" disponível para quem tem permissão `chamados:transferir` (já existe na lista de ações granulares).
- Modal lista técnicos elegíveis (`pode_receber_chamados = true` e mesmo `department_id`, ou todos com permissão de atendimento) + campo "Motivo".
- Antes de confirmar: `AlertDialog` avisando "O chamado será transferido. Para você ele ficará marcado como ENCERRADO (somente visualização) e não poderá ser reaberto."
- Backend (migration):
  - Trigger / RPC `transferir_chamado(chamado_id, novo_tecnico_id, motivo)` que:
    1. Insere em `transferencias_chamado`.
    2. Atualiza `chamados.tecnico_id` para o novo.
    3. Não altera o status real (continua ABERTO/EM_ATENDIMENTO para o novo técnico).
  - Para o técnico anterior, criar visão "Encerrado/somente leitura" no frontend: se `usuario != tecnico_id atual` mas existe registro em `transferencias_chamado` onde `tecnico_anterior_id = auth.uid()`, esconder ações de edição/reabertura.
- Permitir INSERT em `transferencias_chamado` para técnicos (hoje só tem SELECT).

### 6. Gatilhos de e-mail
- Revisar `supabase/functions/send-email`, `forgot-password`, `change-password-secure`.
- Verificar logs recentes (`edge_function_logs`) por falhas.
- Garantir: tratamento de erro com retry, validação de `RESEND_API_KEY`/`LOVABLE_API_KEY`, fallback de logs em `email_send_log`.
- Confirmar que os triggers de DB (chamado aberto, encerrado, transferido, senha provisória) realmente chamam a edge function.

---

### Ordem sugerida de entrega
1, 2, 3 (rápidos, baixo risco) → 5 (migração + UI) → 4 (depende de 5 para dados de transferência) → 6 (auditoria + ajustes).

### Confirme antes de eu começar:
- **Transferência**: quem pode transferir = qualquer usuário com permissão `chamados:transferir`, certo? E o destino só pode ser quem tem `pode_receber_chamados = true`?
- **Relatórios**: quer manter export PDF/Excel atuais e adicionar uma aba "Transferências", ou refazer toda a página em abas (Visão Geral / SLA / Transferências / Exportar)?

Posso prosseguir?