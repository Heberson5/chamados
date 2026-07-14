-- Diagnóstico: identificar chamados/usuários que podem ser dados de teste
-- (não cadastrados/configurados pela sua operação) aparecendo no Kanban.
--
-- Como Master, a regra "Admin and Master full access chamados" mostra TODOS
-- os chamados da base — por desenho, para permitir gestão completa do
-- helpdesk. Se estão aparecendo chamados que você não reconhece, o mais
-- provável é que sejam registros de teste (criados durante o
-- desenvolvimento do app) que ainda estão na mesma base de dados em
-- produção, e não um problema de permissão.
--
-- Rode as consultas abaixo no SQL Editor do Supabase (somente leitura,
-- nenhuma delas altera dados) para confirmar antes de decidir o que apagar.

-- 1) Todos os solicitantes (quem abriu chamados) e quantos chamados cada um tem.
--    Olhe para nomes/e-mails que você não reconhece como usuários reais da empresa.
SELECT
  p.id            AS usuario_id,
  p.email,
  p.nome,
  p.sobrenome,
  p.regra,
  p.ativo,
  count(c.id)     AS total_chamados,
  min(c.gerado_em) AS primeiro_chamado,
  max(c.gerado_em) AS ultimo_chamado
FROM public.chamados c
JOIN public.profiles p ON p.id = c.usuario_id
GROUP BY p.id, p.email, p.nome, p.sobrenome, p.regra, p.ativo
ORDER BY total_chamados DESC;

-- 2) Perfis com cara de conta de teste/demo (ajuste os padrões conforme necessário).
SELECT id, email, nome, sobrenome, regra, ativo, criado_em
FROM public.profiles
WHERE email ILIKE '%test%'
   OR email ILIKE '%demo%'
   OR email ILIKE '%example.com%'
   OR ativo = false
ORDER BY criado_em;

-- 3) Chamados abertos por essas contas de teste/demo (lista os chamados, não apaga nada).
SELECT c.id, c.os, c.titulo, c.status, c.gerado_em, p.email AS solicitante
FROM public.chamados c
JOIN public.profiles p ON p.id = c.usuario_id
WHERE p.email ILIKE '%test%'
   OR p.email ILIKE '%demo%'
   OR p.email ILIKE '%example.com%'
   OR p.ativo = false
ORDER BY c.gerado_em;

-- 4) Chamados mais antigos (ordem crescente) — útil para achar o "primeiro lote"
--    de testes criado antes do uso real pela sua equipe começar.
SELECT c.id, c.os, c.titulo, c.status, c.gerado_em, p.email AS solicitante
FROM public.chamados c
JOIN public.profiles p ON p.id = c.usuario_id
ORDER BY c.gerado_em ASC
LIMIT 50;

-- Depois de revisar os resultados acima e confirmar quais registros são de
-- teste, me diga quais IDs/contas quer remover que eu preparo o DELETE
-- (com WHERE explícito nos IDs confirmados — nunca um DELETE genérico em
-- tabela de produção).
