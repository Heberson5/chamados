# Plano de implementação

Esse escopo é grande e mexe em áreas críticas (status de chamados, permissões, backup). Vou dividir em 4 blocos entregues no mesmo ciclo, mas em migrations e commits separados para reduzir risco.

---

## Bloco 1 — Status de chamados customizáveis

Hoje status são um enum fixo (`ABERTO`, `EM_ATENDIMENTO`, `PAUSADO`, `ENCERRADO`, `CANCELADO`) espalhado pelo código. Como você pediu "totalmente customizáveis", crio uma tabela e mapeio o enum antigo para as linhas iniciais.

**Nova tabela `chamado_status`** (Master gerencia):
- `key` (slug estável, ex.: `aguardando`), `label`, `cor`, `ordem` (número 1,2,3…), `is_inicial`, `is_pausa`, `is_encerrado`, `is_cancelado`, `ativo`.
- Seed com os status atuais + um novo `AGUARDANDO` como `is_inicial` e ordem 1.
- `chamados.status_id` (novo FK) coexiste com `status` (enum antigo) por compatibilidade; código novo lê pelo FK, migration popula a partir do enum.

**Tela nova em Configurações → "Status do Kanban"**:
- Lista drag-to-reorder com numeração visível.
- Editar nome/cor, marcar flags `is_inicial` / `is_pausa` (apenas 1 de cada), `is_encerrado`, `is_cancelado`.
- Apenas Master edita.

## Bloco 2 — Kanban e Lista de Chamados

**Kanban (`ChamadosKanban.tsx`)**:
- Drag & drop consertado: hoje o handler não persiste; ligo ao update de `status_id` via mutation e atualizo cache do React Query.
- Layout desktop: colunas com `min-h-[70vh]`, cards em grid vertical sem `max-height` fixo — a rolagem passa a ser da página, não da coluna. Em telas ≥1280px, larguras mínimas maiores.
- Ordem das colunas = `ordem` da tabela `chamado_status`.

**Nova prioridade** (fix): `abrirChamadoUseCase` e a chamada do frontend hardcodam `P4`. Passo a prioridade selecionada no form e persisto.

**Status inicial**: ao criar chamado, uso o `chamado_status` com `is_inicial = true` (fallback `AGUARDANDO`).

**Ao pausar**: transição para o status com `is_pausa = true`.

**Ao atender** (mudar para status "em atendimento"): abre modal com campo opcional **"Previsão de conclusão"** (`datetime-local`) → grava em nova coluna `chamados.previsao_conclusao TIMESTAMPTZ NULL`. Mostra no card e na lista.

**Lista (`src/pages/Chamados.tsx`)**: hoje só exibe. Adiciono as mesmas ações do Kanban via menu por linha: mudar status, atender (com previsão), pausar, encerrar, editar prioridade, transferir, ver detalhes. Reaproveito os mesmos dialogs do Kanban.

## Bloco 3 — Backup (novo menu, só Master)

Backend é Lovable Cloud gerenciado — sem `pg_dump`, sem trocar host de banco pelo app. Faço o máximo possível:

**Nova rota `/backup`** com permissão `backup` (adicionada ao role Master automaticamente e bloqueada para os demais).

**Funcionalidades**:
1. **Exportar tudo** → Edge function `backup-export` que lê todas as tabelas públicas via service role e devolve um **arquivo `.json`** único (schema + linhas) baixado no navegador. Formato próprio, versionado, reimportável.
2. **Exportar CSV por tabela** → botão por tabela usando a mesma function.
3. **Importar** → upload do `.json` gerado; edge function `backup-import` faz `upsert` por PK dentro de transação, com dry-run opcional.
4. **Log e status** → nova tabela `backup_logs` (tipo: export/import, iniciado_em, finalizado_em, status, tamanho, erro, usuario_id). Lista na tela com filtros.
5. **"Configuração de onde está o banco"** → como o host é gerenciado, exponho um painel **somente leitura** com URL do projeto, região e um aviso claro: "Banco gerenciado pelo Lovable Cloud. Para migrar de host, use este export e importe no destino." Sem campo editável (mudar o host quebraria o app inteiro).
6. **"Local do backup"** → seleção entre: (a) download direto no navegador, (b) salvar em bucket de Storage `backups` (crio o bucket, privado, só Master lê). Config salva em `system_settings`.

## Bloco 4 — Performance e carregamento

**Diagnóstico primeiro** (relato antes de mexer): abro Chamados e Configurações com Playwright, meço waterfall de rede e identifico as queries/renders que aparecem depois. Suspeitas iniciais:
- Múltiplos `useEffect` disparando fetches em série em vez de paralelo.
- Falta de `Suspense`/skeleton único — cada seção resolve isolada.
- Bundle sem code-splitting por rota (hoje tudo entra no chunk principal).

**Ações previstas**:
- `React.lazy` + `Suspense` por rota em `App.tsx`, com skeleton único por página (elimina o "carrega em duas etapas").
- Consolidar queries do Settings e Chamados em `Promise.all` + `useQueries` com `suspense`.
- `manualChunks` no `vite.config.ts` separando `recharts`, `@radix-ui`, `@supabase`.
- Habilitar `build.cssCodeSplit`, `build.minify: 'esbuild'`, e verificar se o nginx da VPS está com gzip/brotli e cache de assets — se não estiver, ajusto o `nginx.conf` do projeto.
- Índices que estiverem faltando nas queries mais lentas serão adicionados via migration.

Sobre a VPS: se o gargalo for o backend `help-me-main/api` (Node/Prisma/Postgres da sua stack), reporto a causa e proponho ajuste — mas não vou reescrever aquele serviço nesse ciclo.

---

## Ordem de execução no chat

1. Migration: `chamado_status`, `chamados.status_id`, `chamados.previsao_conclusao`, `backup_logs`, permissão `backup`, bucket `backups`.
2. UI Configurações → Status do Kanban.
3. Fix prioridade + status inicial no `abrirChamadoUseCase` e frontend de criar chamado.
4. Kanban: drag&drop funcional + layout desktop + modal de previsão + pausa configurável.
5. Lista de chamados com paridade de ações.
6. Menu Backup + edge functions `backup-export` / `backup-import` + tela.
7. Performance: lazy routes, code splitting, medição na VPS, ajuste do nginx se necessário.
8. Rodar typecheck e Playwright para validar Kanban drag, criação com prioridade, previsão, export/import.

## Detalhes técnicos

- Migrations sempre com `GRANT` e RLS (Master via `is_admin()`/`check_is_master()`).
- Enum `ChamadoStatus` fica só para compatibilidade com `help-me-main/api`; o front passa a usar `status_id`.
- Edge functions com Zod, CORS, `verify_jwt` validado em código, service role só no servidor.
- `backup-export` faz streaming se o payload passar de ~50MB para evitar OOM no runtime da function.

Confirma que posso seguir com esse plano?