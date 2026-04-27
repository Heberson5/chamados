-- Normalize permissions for existing roles to use technical keys (JSONB)
UPDATE public.role_definitions 
SET permissions = to_jsonb(ARRAY['usuarios', 'usuarios:visualizar', 'usuarios:criar', 'usuarios:editar', 'chamados', 'chamados:visualizar', 'chamados:criar', 'chamados:editar', 'chamados:encerrar', 'relatorios', 'relatorios:visualizar', 'inventario', 'inventario:visualizar'])
WHERE name ILIKE 'Administrador';

UPDATE public.role_definitions 
SET permissions = to_jsonb(ARRAY['chamados', 'chamados:visualizar', 'chamados:criar', 'chamados:editar', 'chamados:encerrar', 'relatorios', 'relatorios:visualizar'])
WHERE name ILIKE 'Técnico';

UPDATE public.role_definitions 
SET permissions = to_jsonb(ARRAY['chamados', 'chamados:visualizar', 'chamados:criar', 'chamados:editar'])
WHERE name ILIKE 'Usuário';

-- Ensure system_settings has a default session timeout (stored in minutes)
INSERT INTO public.system_settings (key, value)
VALUES ('session_timeout', '300') 
ON CONFLICT (key) DO NOTHING;
