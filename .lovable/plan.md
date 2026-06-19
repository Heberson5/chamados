# Plano de Implementação

## 1. Permissões — correções
- Investigar `src/pages/Permissions.tsx` e endpoint de update em `role_definitions` para descobrir por que a edição não está salvando (provável erro de RLS ou estado controlado).
- Bloquear na UI e no backend:
  - Perfil "Master" não pode ser excluído nem ter permissões removidas.
  - Permissão do menu "permissoes" não pode ser desativada para o Master.
- Adicionar verificação no `Permissions.tsx` (botões desabilitados + tooltip) e policy/trigger no banco impedindo `DELETE` ou `UPDATE` que remova `permissoes` do role "Master".

## 2. Favicon na tela de login
- Hoje o favicon é definido em `index.html` estaticamente. Criar um hook/componente `useFavicon` que lê `branding.favicon` (ou `companyLogo`) de `system_settings` e injeta `<link rel="icon">` dinamicamente.
- Aplicar em `Login.tsx` (e Layout, para manter consistente após login).

## 3. Logoff automático por inatividade
- O `useSessionTimeout` lê `system_settings.session_timeout` mas o valor pode estar salvo em outro formato (objeto `{value: number}`). Validar leitura e padronizar.
- Garantir que o timer é iniciado/reiniciado corretamente e dispara `supabase.auth.signOut()`.

## 4. Desconectar usuário em tempo real (force logout)
- Em `Users.tsx`, botão "Desconectar" por usuário (apenas Admin/Master).
- Implementar via canal Realtime broadcast: backend envia evento em canal `force-logout:{user_id}`; cliente escuta em `Layout.tsx` e faz `signOut()`.
- Alternativa server-side: edge function `admin-force-logout` que chama `auth.admin.signOut(user_id)` usando service role, e também emite broadcast para fechar imediatamente abas abertas.

## 5. Horários permitidos de acesso
- Migration: adicionar colunas `access_schedule jsonb` em `profiles` e `departamentos` (`{enabled, days:[0-6], start:'HH:MM', end:'HH:MM', timezone}`).
- UI: editor de horários em `Users.tsx` (por usuário) e `Departments.tsx` (por departamento). Usuário herda do departamento se não tiver próprio.
- Login: após autenticar, verificar horário; se fora, exibir pop-up "Fora do horário permitido" e deslogar.
- Em sessão ativa: hook `useAccessSchedule` calcula tempo restante até `end`.
  - Quando restar X minutos (configurável, default 30): pop-up + Notification API ("restam X minutos…").
  - Após fechar pop-up: timer regressivo fixo no topo (`AccessCountdownBar` em `Layout.tsx`).
  - Quando restar Y minutos (default 5): segundo pop-up.
  - Ao expirar: logoff automático.

## 6. Configurações → Notificações
- Aba/seção em `Settings.tsx` (já existe Notificações? adicionar campos):
  - `pre_warning_minutes` (default 30)
  - `final_warning_minutes` (default 5)
  - Toggle para notificações do navegador (pede `Notification.requestPermission()`).
- Salvar em `system_settings.access_schedule_warnings`.

## 7. Status Online em Usuários
- Usar Supabase Realtime Presence em canal global `presence:users`.
- `Layout.tsx` faz `track({user_id, online_at})` ao montar; desconecta ao desmontar (cobre fechar navegador/aba).
- `Users.tsx` assina o mesmo canal e marca cada linha com badge verde "Online" / cinza "Offline".
- Logoff automático ao desligar/reiniciar: garantido pelo `beforeunload` + presença Realtime (servidor remove presença quando socket cai). Adicionar handler `beforeunload` que chama `supabase.auth.signOut()` apenas se configurado, ou apenas remover presença (manter sessão para reabertura).
  - **Decisão necessária**: signOut em `beforeunload` significa que recarregar a página exige login novamente. Recomendo apenas remover presença e manter a sessão; logoff "real" só por inatividade/horário. Confirmar com o usuário se quiser logoff forçado ao fechar.

## Detalhes Técnicos
- Migrations:
  - `ALTER TABLE profiles ADD COLUMN access_schedule jsonb;`
  - `ALTER TABLE departamentos ADD COLUMN access_schedule jsonb;`
  - Trigger/policy protegendo role "Master" em `role_definitions`.
  - Seed: `system_settings.access_schedule_warnings = {pre:30, final:5, browser_notify:true}`.
- Edge function: `admin-force-logout` (service role, valida que requester é admin/master).
- Componentes novos: `AccessScheduleEditor.tsx`, `AccessCountdownBar.tsx`, `useAccessSchedule.tsx`, `useFavicon.tsx`, `useOnlineUsers.tsx`.
- Arquivos editados: `Login.tsx`, `Layout.tsx`, `Settings.tsx`, `Users.tsx`, `Departments.tsx`, `Permissions.tsx`, `useSessionTimeout.tsx`.

## Pergunta antes de implementar
Logoff ao fechar navegador/desligar PC: você quer **(a)** apenas marcar offline (sessão continua válida ao reabrir, mais conveniente) ou **(b)** signOut real (precisa logar de novo sempre que abrir)?
