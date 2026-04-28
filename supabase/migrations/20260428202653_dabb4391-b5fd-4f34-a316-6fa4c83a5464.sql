-- 1. Remove 'financeiro' from role_definitions for Master role
UPDATE public.role_definitions 
SET permissions = permissions - 'financeiro'
WHERE name = 'Master';

-- 2. Update layout_settings to include Departamentos (id: '9')
UPDATE public.system_settings
SET value = jsonb_set(
    value, 
    '{menuOrder}', 
    (value->'menuOrder') || '{"id": "9", "path": "/departamentos", "label": "Departamentos", "visible": true}'::jsonb
)
WHERE key = 'layout_settings' 
AND NOT (value->'menuOrder' @> '[{"id": "9"}]'::jsonb);

-- 3. Seed initial departments
INSERT INTO public.departamentos (nome, descricao)
SELECT 'TI', 'Tecnologia da Informação e Suporte'
WHERE NOT EXISTS (SELECT 1 FROM public.departamentos WHERE nome = 'TI');

INSERT INTO public.departamentos (nome, descricao)
SELECT 'RH', 'Recursos Humanos'
WHERE NOT EXISTS (SELECT 1 FROM public.departamentos WHERE nome = 'RH');

INSERT INTO public.departamentos (nome, descricao)
SELECT 'Financeiro', 'Departamento Financeiro e Contabilidade'
WHERE NOT EXISTS (SELECT 1 FROM public.departamentos WHERE nome = 'Financeiro');

INSERT INTO public.departamentos (nome, descricao)
SELECT 'Comercial', 'Vendas e Relacionamento com Cliente'
WHERE NOT EXISTS (SELECT 1 FROM public.departamentos WHERE nome = 'Comercial');
