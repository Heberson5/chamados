-- A tela de Permissões (Chamados) passa a valer de verdade para as ações
-- que sempre foram liberadas por padrão a técnico/admin/master via código
-- (Atender, Editar prioridade, Encerrar, Reabrir, Transferir): agora o
-- app soma essas duas fontes — quem já tinha por papel continua tendo, e
-- o toggle da tela de Permissões passa a poder AMPLIAR isso (ex: liberar
-- "Transferir" também para um Usuário específico, se o admin quiser).
--
-- Aqui só ADICIONAMOS as chaves que faltam no array de cada perfil
-- padrão, sem tocar em nenhuma outra entrada já existente (outros menus,
-- customizações feitas na tela de Permissões etc.) — nada é sobrescrito.
--
-- Cancelar, Excluir em Massa e Cadastro Retroativo continuam regra fixa
-- no código (Master, ou Admin+Master no caso de Cancelar, como pedido) —
-- a permissão granular desses três só pode restringir ainda mais (AND),
-- nunca ampliar para técnico/usuário.

UPDATE public.role_definitions
SET permissions = (
  SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb)
  FROM jsonb_array_elements(
    COALESCE(permissions, '[]'::jsonb)
    || '["chamados:reabrir", "chamados:assumir_chamado", "chamados:transferir"]'::jsonb
  ) elem
)
WHERE name ILIKE 'Técnico';

-- Usuário nunca teve, na prática, permissão de alterar a prioridade do
-- próprio chamado (ação sempre restrita a técnico/admin/master no
-- código) — remove "chamados:editar" caso tenha ficado presente de uma
-- migração anterior, para não liberar isso por engano agora que o toggle
-- passa a valer de verdade. Adiciona "chamados:ver_interações" só para o
-- inventário ficar correto (essa ação nunca foi restrita).
UPDATE public.role_definitions
SET permissions = (
  SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb)
  FROM jsonb_array_elements(
    (COALESCE(permissions, '[]'::jsonb) || '["chamados:ver_interacoes"]'::jsonb) - 'chamados:editar'
  ) elem
)
WHERE name ILIKE 'Usuário';
