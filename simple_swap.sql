BEGIN;
SET CONSTRAINTS ALL DEFERRED;
-- Swapping ID for categorias
ALTER TABLE public."categorias" DROP CONSTRAINT IF EXISTS "categorias_pkey" CASCADE;
ALTER TABLE public."categorias" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."categorias" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."categorias" ADD PRIMARY KEY (id);
-- Swapping ID for system_settings
ALTER TABLE public."system_settings" DROP CONSTRAINT IF EXISTS "system_settings_pkey" CASCADE;
ALTER TABLE public."system_settings" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."system_settings" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."system_settings" ADD PRIMARY KEY (id);
-- Swapping ID for comentarios_chamado
ALTER TABLE public."comentarios_chamado" DROP CONSTRAINT IF EXISTS "comentarios_chamado_pkey" CASCADE;
ALTER TABLE public."comentarios_chamado" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."comentarios_chamado" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."comentarios_chamado" ADD PRIMARY KEY (id);
-- Swapping ID for system_manuals
ALTER TABLE public."system_manuals" DROP CONSTRAINT IF EXISTS "system_manuals_pkey" CASCADE;
ALTER TABLE public."system_manuals" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."system_manuals" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."system_manuals" ADD PRIMARY KEY (id);
-- Swapping ID for expedientes
ALTER TABLE public."expedientes" DROP CONSTRAINT IF EXISTS "expedientes_pkey" CASCADE;
ALTER TABLE public."expedientes" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."expedientes" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."expedientes" ADD PRIMARY KEY (id);
-- Swapping ID for itens_solicitacao_compra
ALTER TABLE public."itens_solicitacao_compra" DROP CONSTRAINT IF EXISTS "itens_solicitacao_compra_pkey" CASCADE;
ALTER TABLE public."itens_solicitacao_compra" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."itens_solicitacao_compra" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."itens_solicitacao_compra" ADD PRIMARY KEY (id);
-- Swapping ID for reembolsos
ALTER TABLE public."reembolsos" DROP CONSTRAINT IF EXISTS "reembolsos_pkey" CASCADE;
ALTER TABLE public."reembolsos" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."reembolsos" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."reembolsos" ADD PRIMARY KEY (id);
-- Swapping ID for departamentos
ALTER TABLE public."departamentos" DROP CONSTRAINT IF EXISTS "departamentos_pkey" CASCADE;
ALTER TABLE public."departamentos" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."departamentos" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."departamentos" ADD PRIMARY KEY (id);
-- Swapping ID for chamados_prioridades
ALTER TABLE public."chamados_prioridades" DROP CONSTRAINT IF EXISTS "chamados_prioridades_pkey" CASCADE;
ALTER TABLE public."chamados_prioridades" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."chamados_prioridades" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."chamados_prioridades" ADD PRIMARY KEY (id);
-- Swapping ID for audit_logs
ALTER TABLE public."audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_pkey" CASCADE;
ALTER TABLE public."audit_logs" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."audit_logs" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."audit_logs" ADD PRIMARY KEY (id);
-- Swapping ID for notificacoes
ALTER TABLE public."notificacoes" DROP CONSTRAINT IF EXISTS "notificacoes_pkey" CASCADE;
ALTER TABLE public."notificacoes" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."notificacoes" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."notificacoes" ADD PRIMARY KEY (id);
-- Swapping ID for ordens_de_servico
ALTER TABLE public."ordens_de_servico" DROP CONSTRAINT IF EXISTS "ordens_de_servico_pkey" CASCADE;
ALTER TABLE public."ordens_de_servico" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."ordens_de_servico" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."ordens_de_servico" ADD PRIMARY KEY (id);
-- Swapping ID for movimentacoes_estoque
ALTER TABLE public."movimentacoes_estoque" DROP CONSTRAINT IF EXISTS "movimentacoes_estoque_pkey" CASCADE;
ALTER TABLE public."movimentacoes_estoque" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."movimentacoes_estoque" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."movimentacoes_estoque" ADD PRIMARY KEY (id);
-- Swapping ID for estoque_setor
ALTER TABLE public."estoque_setor" DROP CONSTRAINT IF EXISTS "estoque_setor_pkey" CASCADE;
ALTER TABLE public."estoque_setor" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."estoque_setor" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."estoque_setor" ADD PRIMARY KEY (id);
-- Swapping ID for help_menu_manuals
ALTER TABLE public."help_menu_manuals" DROP CONSTRAINT IF EXISTS "help_menu_manuals_pkey" CASCADE;
ALTER TABLE public."help_menu_manuals" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."help_menu_manuals" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."help_menu_manuals" ADD PRIMARY KEY (id);
-- Swapping ID for chamados
ALTER TABLE public."chamados" DROP CONSTRAINT IF EXISTS "chamados_pkey" CASCADE;
ALTER TABLE public."chamados" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."chamados" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."chamados" ADD PRIMARY KEY (id);
-- Swapping ID for profiles
ALTER TABLE public."profiles" DROP CONSTRAINT IF EXISTS "profiles_pkey" CASCADE;
ALTER TABLE public."profiles" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."profiles" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."profiles" ADD PRIMARY KEY (id);
-- Swapping ID for solicitacoes_compra
ALTER TABLE public."solicitacoes_compra" DROP CONSTRAINT IF EXISTS "solicitacoes_compra_pkey" CASCADE;
ALTER TABLE public."solicitacoes_compra" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."solicitacoes_compra" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."solicitacoes_compra" ADD PRIMARY KEY (id);
-- Swapping ID for transferencias_chamado
ALTER TABLE public."transferencias_chamado" DROP CONSTRAINT IF EXISTS "transferencias_chamado_pkey" CASCADE;
ALTER TABLE public."transferencias_chamado" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."transferencias_chamado" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."transferencias_chamado" ADD PRIMARY KEY (id);
-- Swapping ID for servicos
ALTER TABLE public."servicos" DROP CONSTRAINT IF EXISTS "servicos_pkey" CASCADE;
ALTER TABLE public."servicos" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."servicos" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."servicos" ADD PRIMARY KEY (id);
-- Swapping ID for itens_inventario
ALTER TABLE public."itens_inventario" DROP CONSTRAINT IF EXISTS "itens_inventario_pkey" CASCADE;
ALTER TABLE public."itens_inventario" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."itens_inventario" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."itens_inventario" ADD PRIMARY KEY (id);
-- Swapping ID for baixas
ALTER TABLE public."baixas" DROP CONSTRAINT IF EXISTS "baixas_pkey" CASCADE;
ALTER TABLE public."baixas" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."baixas" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."baixas" ADD PRIMARY KEY (id);
-- Swapping ID for itens_baixa
ALTER TABLE public."itens_baixa" DROP CONSTRAINT IF EXISTS "itens_baixa_pkey" CASCADE;
ALTER TABLE public."itens_baixa" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."itens_baixa" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."itens_baixa" ADD PRIMARY KEY (id);
-- Swapping ID for fornecedores
ALTER TABLE public."fornecedores" DROP CONSTRAINT IF EXISTS "fornecedores_pkey" CASCADE;
ALTER TABLE public."fornecedores" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."fornecedores" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."fornecedores" ADD PRIMARY KEY (id);
-- Swapping ID for role_definitions
ALTER TABLE public."role_definitions" DROP CONSTRAINT IF EXISTS "role_definitions_pkey" CASCADE;
ALTER TABLE public."role_definitions" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."role_definitions" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."role_definitions" ADD PRIMARY KEY (id);
-- Swapping ID for organizations
ALTER TABLE public."organizations" DROP CONSTRAINT IF EXISTS "organizations_pkey" CASCADE;
ALTER TABLE public."organizations" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."organizations" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."organizations" ADD PRIMARY KEY (id);
-- Swapping ID for user_roles
ALTER TABLE public."user_roles" DROP CONSTRAINT IF EXISTS "user_roles_pkey" CASCADE;
ALTER TABLE public."user_roles" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."user_roles" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."user_roles" ADD PRIMARY KEY (id);
DROP POLICY IF EXISTS profiles_self_all ON public.profiles;
CREATE POLICY profiles_self_all ON public.profiles USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
COMMIT;