# Instruções do projeto

## Manter a tela de Permissões sincronizada

Sempre que uma alteração adicionar, remover ou restringir uma função/ação
(ex: um novo botão de ação num chamado, uma nova aba em Configurações),
atualize `src/pages/Permissions.tsx` (array `availableMenus`) para
refletir isso — incluir a ação nova ou remover a que deixou de existir.
Não é necessário que o usuário peça a cada vez; isso deve ser feito por
padrão, como parte da própria alteração.

**Importante — natureza dessa lista, menu "Chamados"**: desde 2026-09-16 as
ações de Chamados (`chamados:*`) são checadas de verdade via
`hasPermission()` em `Chamados.tsx`, `ChamadoDetailDialog.tsx` e
`ChamadosKanban.tsx` — não são mais só documentação. O padrão usado é:

- **Atender, Editar (prioridade), Encerrar, Reabrir, Transferir**: piso
  histórico (`userRole !== "USUARIO"`) **OU** `hasPermission('chamados:x')`.
  Ou seja, o toggle só pode *ampliar* acesso (ex: liberar "Transferir" para
  um Usuário específico) — nunca tira o que técnico/admin/master já tinham,
  mesmo que o array de permissões do papel esteja desatualizado ou vazio.
- **Cancelar** (`chamados:cancelar`): regra fixa `ADMIN`/`MASTER` **E**
  `hasPermission(...)` — o toggle só pode *restringir* mais (ex: tirar de
  Admin, deixando só Master), nunca liberar para técnico/usuário.
- **Excluir em Massa** (`chamados:excluir_em_massa`) e **Cadastro
  Retroativo** (`chamados:cadastro_retroativo`): mesma lógica, só que a
  regra fixa é `MASTER` sozinho (não Admin).
- **Visualizar, Criar, Ver Interações**: permanecem sem gate (sempre
  liberados) — são ações básicas de autoatendimento do próprio usuário
  (abrir chamado, ver/comentar o que é seu); nunca as restrinja sem pedido
  explícito, é alto risco de travar o fluxo principal do app.

Migração `20260916120000_sync_chamados_granular_permissions.sql` faz o
array de permissões de "Técnico" e "Usuário" bater com o piso de código
acima (só ADICIONA/REMOVE as chaves de `chamados:*` estritamente
necessárias, sem tocar no resto do array — testada localmente, é
idempotente). "Master" e "Administrador" não precisaram de migração
porque hoje carregam `"Acesso Total"` (bypassa `hasPermission` inteiro) —
se isso um dia mudar, reveja se as regras fixas acima (que usam `userRole`
diretamente, não dependem desse array) ainda cobrem os dois.

**Outros menus** (Dashboard, Usuários, Relatórios, etc.): continuam
**apenas documentação/inventário** — nenhuma ação granular deles é lida em
lugar nenhum do app. Ao mexer neles, mantenha a lista sincronizada (regra
geral acima), mas não assuma que o toggle funciona de verdade a menos que
você mesmo tenha acabado de ligar (seguindo o padrão OR/AND descrito
acima) — isso é trabalho à parte, um menu por vez, quando pedido.

## Sobre o MCP do Supabase nesta conta

O projeto Supabase chamado "chamados" (id `qtoettpydnhznkorndzs`) visível
via `mcp__Supabase__list_projects` **não é o backend real deste app** —
foi conferido em 2026-09-16 e está totalmente vazio (0 tabelas, 0
usuários), apesar do nome. O backend de produção real fica em outra conta/
projeto Supabase não acessível a partir deste MCP. Não assuma que dá pra
inspecionar ou aplicar migração ao vivo nesta conta — trate mudanças de
banco como arquivos de migração em `supabase/migrations/`, para o usuário
aplicar (painel do Supabase, CLI, ou pedindo pra conectar o projeto certo).

## Padrão de branch/deploy deste repositório

Desenvolvimento nesta sessão acontece na branch
`claude/chamados-exclusao-retroativo-k6zedw` e depois é mesclado
(`--no-ff`) direto na `main`, pois é o que faz a alteração valer no app em
produção (não há pipeline de PR/review neste repositório). Validar sempre
com `npx tsc --noEmit -p tsconfig.app.json` e `npm run build` antes de dar
push na `main`.
