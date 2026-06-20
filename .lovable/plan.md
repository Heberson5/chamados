## Plano de Implementação

Vou executar 6 mudanças, agrupadas por área. Todas em uma única rodada de implementação.

### 1. Error Boundary global (anti tela branca)
- Criar `src/components/ErrorBoundary.tsx` (classe React) que captura erros de render, incluindo falhas do Realtime/Presence.
- Tela de fallback com mensagem amigável e botões "Tentar novamente" e "Recarregar".
- Envolver `<App />` em `src/main.tsx`.
- Endurecer `useOnlineUsers` para envolver `subscribe/track` em try/catch e não derrubar a árvore se o canal falhar.

### 2. Permissões editáveis
- Investigar e corrigir o salvamento de permissões em `Permissions.tsx` (provavelmente o estado de checkboxes não está sendo persistido / `update` falhando por RLS ou payload).
- Garantir que toggles dos itens funcionem mesmo após carregar o registro salvo.
- Manter regra: perfil Master não pode perder `permissoes` nem ser excluído (já existe no trigger).

### 3. Horário de acesso por dia da semana
- Trocar formato de `access_schedule` para:
  ```
  { enabled: bool, days: { "0": {enabled, start, end}, ..., "6": {...} } }
  ```
- Refatorar `AccessScheduleEditor.tsx` para mostrar cada dia da semana com seu próprio par início/fim e toggle individual.
- Atualizar `src/lib/accessSchedule.ts` (`evaluateSchedule`) para aplicar horário do dia corrente.
- Manter retrocompatibilidade: se vier o formato antigo (`days[], start, end`), converter na leitura.
- Usado tanto em Usuários quanto Departamentos sem mudança de schema (campo já é JSONB).

### 4. Excel com mesma formatação do PDF
- Criar helper `src/lib/excelReport.ts` usando `xlsx-js-style` (ou `exceljs` se já presente). Verificar dependências.
- Aplicar: logo da empresa no topo (via `addImage` se `exceljs`), cores de cabeçalho iguais ao PDF, larguras de coluna, bordas, alinhamento e linhas zebra.
- Substituir geração atual de Excel em `Reports.tsx` por esse helper, passando os mesmos dados/colunas do PDF.

### 5. Proteções do Master e auto-ação
- UI em `Users.tsx`: ocultar usuários Master para quem NÃO é Master. Desabilitar botões "Desativar" e "Desconectar" se:
  - alvo é Master, ou
  - alvo é o próprio usuário logado.
- Backend (camada de proteção real):
  - Trigger SQL `protect_master_profile` que bloqueia `UPDATE profiles SET ativo=false` quando o alvo é Master.
  - Edge function `admin-force-logout` valida: alvo não pode ser Master e não pode ser o próprio solicitante; retorna 403 caso contrário.
  - Edge function `admin-update-user` aplica as mesmas regras antes de desativar.

### 6. Tooltips no menu lateral recolhido
- Em `Sidebar.tsx`, quando `collapsed`, envolver cada botão de menu em `<Tooltip>` (shadcn `tooltip`) mostrando o nome à direita.
- Adicionar `<TooltipProvider>` no topo do sidebar.

### Arquivos a criar
- `src/components/ErrorBoundary.tsx`
- `src/lib/excelReport.ts`
- Migration SQL: trigger `protect_master_profile_deactivation`

### Arquivos a editar
- `src/main.tsx`, `src/hooks/useOnlineUsers.tsx`
- `src/pages/Permissions.tsx`
- `src/components/AccessScheduleEditor.tsx`, `src/lib/accessSchedule.ts`
- `src/pages/Reports.tsx`
- `src/pages/Users.tsx`, `supabase/functions/admin-force-logout/index.ts`, `supabase/functions/admin-update-user/index.ts`
- `src/components/Sidebar.tsx`

Posso prosseguir?
