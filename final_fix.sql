BEGIN;
ALTER TABLE public."profiles" DROP CONSTRAINT IF EXISTS "profiles_id_fkey";
ALTER TABLE public."profiles" DROP CONSTRAINT IF EXISTS "profiles_organization_id_fkey";
ALTER TABLE public."user_roles" DROP CONSTRAINT IF EXISTS "user_roles_user_id_fkey";
ALTER TABLE public."user_roles" DROP CONSTRAINT IF EXISTS "user_roles_organization_id_fkey";
ALTER TABLE public."expedientes" DROP CONSTRAINT IF EXISTS "expedientes_usuario_id_fkey";
ALTER TABLE public."chamados" DROP CONSTRAINT IF EXISTS "chamados_tecnico_id_fkey";
ALTER TABLE public."chamados" DROP CONSTRAINT IF EXISTS "chamados_prioridade_alterada_por_fkey";
ALTER TABLE public."chamados" DROP CONSTRAINT IF EXISTS "chamados_chamado_pai_id_fkey";
ALTER TABLE public."chamados" DROP CONSTRAINT IF EXISTS "chamados_vinculado_por_fkey";
ALTER TABLE public."ordens_de_servico" DROP CONSTRAINT IF EXISTS "ordens_de_servico_chamado_id_fkey";
ALTER TABLE public."ordens_de_servico" DROP CONSTRAINT IF EXISTS "ordens_de_servico_servico_id_fkey";
ALTER TABLE public."transferencias_chamado" DROP CONSTRAINT IF EXISTS "transferencias_chamado_chamado_id_fkey";
ALTER TABLE public."transferencias_chamado" DROP CONSTRAINT IF EXISTS "transferencias_chamado_tecnico_anterior_id_fkey";
ALTER TABLE public."transferencias_chamado" DROP CONSTRAINT IF EXISTS "transferencias_chamado_tecnico_novo_id_fkey";
ALTER TABLE public."transferencias_chamado" DROP CONSTRAINT IF EXISTS "transferencias_chamado_transferido_por_fkey";
ALTER TABLE public."comentarios_chamado" DROP CONSTRAINT IF EXISTS "comentarios_chamado_chamado_id_fkey";
ALTER TABLE public."comentarios_chamado" DROP CONSTRAINT IF EXISTS "comentarios_chamado_autor_id_fkey";
ALTER TABLE public."reembolsos" DROP CONSTRAINT IF EXISTS "reembolsos_solicitante_id_fkey";
ALTER TABLE public."reembolsos" DROP CONSTRAINT IF EXISTS "reembolsos_aprovador_id_fkey";
ALTER TABLE public."reembolsos" DROP CONSTRAINT IF EXISTS "reembolsos_pagador_id_fkey";
ALTER TABLE public."itens_inventario" DROP CONSTRAINT IF EXISTS "itens_inventario_categoria_id_fkey";
ALTER TABLE public."itens_inventario" DROP CONSTRAINT IF EXISTS "itens_inventario_criado_por_fkey";
ALTER TABLE public."movimentacoes_estoque" DROP CONSTRAINT IF EXISTS "movimentacoes_estoque_item_id_fkey";
ALTER TABLE public."movimentacoes_estoque" DROP CONSTRAINT IF EXISTS "movimentacoes_estoque_realizado_por_fkey";
ALTER TABLE public."estoque_setor" DROP CONSTRAINT IF EXISTS "estoque_setor_item_inventario_id_fkey";
ALTER TABLE public."solicitacoes_compra" DROP CONSTRAINT IF EXISTS "solicitacoes_compra_solicitado_por_fkey";
ALTER TABLE public."solicitacoes_compra" DROP CONSTRAINT IF EXISTS "solicitacoes_compra_fornecedor_id_fkey";
ALTER TABLE public."solicitacoes_compra" DROP CONSTRAINT IF EXISTS "solicitacoes_compra_aprovado_por_fkey";
ALTER TABLE public."solicitacoes_compra" DROP CONSTRAINT IF EXISTS "solicitacoes_compra_rejeitado_por_fkey";
ALTER TABLE public."solicitacoes_compra" DROP CONSTRAINT IF EXISTS "solicitacoes_compra_executado_por_fkey";
ALTER TABLE public."itens_solicitacao_compra" DROP CONSTRAINT IF EXISTS "itens_solicitacao_compra_solicitacao_compra_id_fkey";
ALTER TABLE public."itens_solicitacao_compra" DROP CONSTRAINT IF EXISTS "itens_solicitacao_compra_item_inventario_id_fkey";
ALTER TABLE public."baixas" DROP CONSTRAINT IF EXISTS "baixas_solicitado_por_fkey";
ALTER TABLE public."baixas" DROP CONSTRAINT IF EXISTS "baixas_aprovado_tecnico_por_fkey";
ALTER TABLE public."baixas" DROP CONSTRAINT IF EXISTS "baixas_aprovado_gestor_por_fkey";
ALTER TABLE public."baixas" DROP CONSTRAINT IF EXISTS "baixas_rejeitado_por_fkey";
ALTER TABLE public."baixas" DROP CONSTRAINT IF EXISTS "baixas_executado_por_fkey";
ALTER TABLE public."itens_baixa" DROP CONSTRAINT IF EXISTS "itens_baixa_baixa_id_fkey";
ALTER TABLE public."itens_baixa" DROP CONSTRAINT IF EXISTS "itens_baixa_item_inventario_id_fkey";
ALTER TABLE public."chamados" DROP CONSTRAINT IF EXISTS "chamados_usuario_id_fkey";
ALTER TABLE public."notificacoes" DROP CONSTRAINT IF EXISTS "notificacoes_usuario_id_fkey";
ALTER TABLE public."departamentos" DROP CONSTRAINT IF EXISTS "departamentos_organization_id_fkey";
ALTER TABLE public."chamados_prioridades" DROP CONSTRAINT IF EXISTS "chamados_prioridades_organization_id_fkey";
ALTER TABLE public."chamados" DROP CONSTRAINT IF EXISTS "chamados_department_id_fkey";
ALTER TABLE public."chamados" DROP CONSTRAINT IF EXISTS "chamados_prioridade_new_id_fkey";
ALTER TABLE public."profiles" DROP CONSTRAINT IF EXISTS "profiles_department_id_fkey";
ALTER TABLE public."categorias" DROP CONSTRAINT IF EXISTS "categorias_pkey" CASCADE;
ALTER TABLE public."categorias" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."categorias" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."categorias" ADD PRIMARY KEY (id);
ALTER TABLE public."system_settings" DROP CONSTRAINT IF EXISTS "system_settings_pkey" CASCADE;
ALTER TABLE public."system_settings" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."system_settings" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."system_settings" ADD PRIMARY KEY (id);
ALTER TABLE public."comentarios_chamado" DROP CONSTRAINT IF EXISTS "comentarios_chamado_pkey" CASCADE;
ALTER TABLE public."comentarios_chamado" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."comentarios_chamado" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."comentarios_chamado" ADD PRIMARY KEY (id);
ALTER TABLE public."system_manuals" DROP CONSTRAINT IF EXISTS "system_manuals_pkey" CASCADE;
ALTER TABLE public."system_manuals" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."system_manuals" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."system_manuals" ADD PRIMARY KEY (id);
ALTER TABLE public."expedientes" DROP CONSTRAINT IF EXISTS "expedientes_pkey" CASCADE;
ALTER TABLE public."expedientes" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."expedientes" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."expedientes" ADD PRIMARY KEY (id);
ALTER TABLE public."itens_solicitacao_compra" DROP CONSTRAINT IF EXISTS "itens_solicitacao_compra_pkey" CASCADE;
ALTER TABLE public."itens_solicitacao_compra" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."itens_solicitacao_compra" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."itens_solicitacao_compra" ADD PRIMARY KEY (id);
ALTER TABLE public."reembolsos" DROP CONSTRAINT IF EXISTS "reembolsos_pkey" CASCADE;
ALTER TABLE public."reembolsos" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."reembolsos" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."reembolsos" ADD PRIMARY KEY (id);
ALTER TABLE public."departamentos" DROP CONSTRAINT IF EXISTS "departamentos_pkey" CASCADE;
ALTER TABLE public."departamentos" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."departamentos" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."departamentos" ADD PRIMARY KEY (id);
ALTER TABLE public."chamados_prioridades" DROP CONSTRAINT IF EXISTS "chamados_prioridades_pkey" CASCADE;
ALTER TABLE public."chamados_prioridades" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."chamados_prioridades" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."chamados_prioridades" ADD PRIMARY KEY (id);
ALTER TABLE public."audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_pkey" CASCADE;
ALTER TABLE public."audit_logs" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."audit_logs" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."audit_logs" ADD PRIMARY KEY (id);
ALTER TABLE public."notificacoes" DROP CONSTRAINT IF EXISTS "notificacoes_pkey" CASCADE;
ALTER TABLE public."notificacoes" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."notificacoes" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."notificacoes" ADD PRIMARY KEY (id);
ALTER TABLE public."ordens_de_servico" DROP CONSTRAINT IF EXISTS "ordens_de_servico_pkey" CASCADE;
ALTER TABLE public."ordens_de_servico" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."ordens_de_servico" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."ordens_de_servico" ADD PRIMARY KEY (id);
ALTER TABLE public."movimentacoes_estoque" DROP CONSTRAINT IF EXISTS "movimentacoes_estoque_pkey" CASCADE;
ALTER TABLE public."movimentacoes_estoque" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."movimentacoes_estoque" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."movimentacoes_estoque" ADD PRIMARY KEY (id);
ALTER TABLE public."estoque_setor" DROP CONSTRAINT IF EXISTS "estoque_setor_pkey" CASCADE;
ALTER TABLE public."estoque_setor" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."estoque_setor" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."estoque_setor" ADD PRIMARY KEY (id);
ALTER TABLE public."help_menu_manuals" DROP CONSTRAINT IF EXISTS "help_menu_manuals_pkey" CASCADE;
ALTER TABLE public."help_menu_manuals" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."help_menu_manuals" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."help_menu_manuals" ADD PRIMARY KEY (id);
ALTER TABLE public."chamados" DROP CONSTRAINT IF EXISTS "chamados_pkey" CASCADE;
ALTER TABLE public."chamados" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."chamados" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."chamados" ADD PRIMARY KEY (id);
ALTER TABLE public."profiles" DROP CONSTRAINT IF EXISTS "profiles_pkey" CASCADE;
ALTER TABLE public."profiles" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."profiles" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."profiles" ADD PRIMARY KEY (id);
ALTER TABLE public."solicitacoes_compra" DROP CONSTRAINT IF EXISTS "solicitacoes_compra_pkey" CASCADE;
ALTER TABLE public."solicitacoes_compra" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."solicitacoes_compra" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."solicitacoes_compra" ADD PRIMARY KEY (id);
ALTER TABLE public."transferencias_chamado" DROP CONSTRAINT IF EXISTS "transferencias_chamado_pkey" CASCADE;
ALTER TABLE public."transferencias_chamado" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."transferencias_chamado" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."transferencias_chamado" ADD PRIMARY KEY (id);
ALTER TABLE public."servicos" DROP CONSTRAINT IF EXISTS "servicos_pkey" CASCADE;
ALTER TABLE public."servicos" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."servicos" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."servicos" ADD PRIMARY KEY (id);
ALTER TABLE public."itens_inventario" DROP CONSTRAINT IF EXISTS "itens_inventario_pkey" CASCADE;
ALTER TABLE public."itens_inventario" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."itens_inventario" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."itens_inventario" ADD PRIMARY KEY (id);
ALTER TABLE public."baixas" DROP CONSTRAINT IF EXISTS "baixas_pkey" CASCADE;
ALTER TABLE public."baixas" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."baixas" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."baixas" ADD PRIMARY KEY (id);
ALTER TABLE public."itens_baixa" DROP CONSTRAINT IF EXISTS "itens_baixa_pkey" CASCADE;
ALTER TABLE public."itens_baixa" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."itens_baixa" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."itens_baixa" ADD PRIMARY KEY (id);
ALTER TABLE public."fornecedores" DROP CONSTRAINT IF EXISTS "fornecedores_pkey" CASCADE;
ALTER TABLE public."fornecedores" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."fornecedores" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."fornecedores" ADD PRIMARY KEY (id);
ALTER TABLE public."role_definitions" DROP CONSTRAINT IF EXISTS "role_definitions_pkey" CASCADE;
ALTER TABLE public."role_definitions" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."role_definitions" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."role_definitions" ADD PRIMARY KEY (id);
ALTER TABLE public."organizations" DROP CONSTRAINT IF EXISTS "organizations_pkey" CASCADE;
ALTER TABLE public."organizations" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."organizations" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."organizations" ADD PRIMARY KEY (id);
ALTER TABLE public."user_roles" DROP CONSTRAINT IF EXISTS "user_roles_pkey" CASCADE;
ALTER TABLE public."user_roles" RENAME COLUMN id TO old_uuid_id;
ALTER TABLE public."user_roles" RENAME COLUMN id_numerico TO id;
ALTER TABLE public."user_roles" ADD PRIMARY KEY (id);
-- Updating profiles.organization_id pointing to organizations
ALTER TABLE public."profiles" ADD COLUMN IF NOT EXISTS "organization_id_new" BIGINT;
UPDATE public."profiles" t SET "organization_id_new" = r.id FROM public."organizations" r WHERE t."organization_id" = r.old_uuid_id;
ALTER TABLE public."profiles" DROP COLUMN IF EXISTS "organization_id";
ALTER TABLE public."profiles" RENAME COLUMN "organization_id_new" TO "organization_id";
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"(id);
-- Updating user_roles.organization_id pointing to organizations
ALTER TABLE public."user_roles" ADD COLUMN IF NOT EXISTS "organization_id_new" BIGINT;
UPDATE public."user_roles" t SET "organization_id_new" = r.id FROM public."organizations" r WHERE t."organization_id" = r.old_uuid_id;
ALTER TABLE public."user_roles" DROP COLUMN IF EXISTS "organization_id";
ALTER TABLE public."user_roles" RENAME COLUMN "organization_id_new" TO "organization_id";
ALTER TABLE public."user_roles" ADD CONSTRAINT "user_roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"(id);
-- Updating expedientes.usuario_id pointing to profiles
ALTER TABLE public."expedientes" ADD COLUMN IF NOT EXISTS "usuario_id_new" BIGINT;
UPDATE public."expedientes" t SET "usuario_id_new" = r.id FROM public."profiles" r WHERE t."usuario_id" = r.old_uuid_id;
ALTER TABLE public."expedientes" DROP COLUMN IF EXISTS "usuario_id";
ALTER TABLE public."expedientes" RENAME COLUMN "usuario_id_new" TO "usuario_id";
ALTER TABLE public."expedientes" ADD CONSTRAINT "expedientes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES public."profiles"(id);
-- Updating chamados.tecnico_id pointing to profiles
ALTER TABLE public."chamados" ADD COLUMN IF NOT EXISTS "tecnico_id_new" BIGINT;
UPDATE public."chamados" t SET "tecnico_id_new" = r.id FROM public."profiles" r WHERE t."tecnico_id" = r.old_uuid_id;
ALTER TABLE public."chamados" DROP COLUMN IF EXISTS "tecnico_id";
ALTER TABLE public."chamados" RENAME COLUMN "tecnico_id_new" TO "tecnico_id";
ALTER TABLE public."chamados" ADD CONSTRAINT "chamados_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES public."profiles"(id);
-- Updating chamados.prioridade_alterada_por pointing to profiles
ALTER TABLE public."chamados" ADD COLUMN IF NOT EXISTS "prioridade_alterada_por_new" BIGINT;
UPDATE public."chamados" t SET "prioridade_alterada_por_new" = r.id FROM public."profiles" r WHERE t."prioridade_alterada_por" = r.old_uuid_id;
ALTER TABLE public."chamados" DROP COLUMN IF EXISTS "prioridade_alterada_por";
ALTER TABLE public."chamados" RENAME COLUMN "prioridade_alterada_por_new" TO "prioridade_alterada_por";
ALTER TABLE public."chamados" ADD CONSTRAINT "chamados_prioridade_alterada_por_fkey" FOREIGN KEY ("prioridade_alterada_por") REFERENCES public."profiles"(id);
-- Updating chamados.chamado_pai_id pointing to chamados
ALTER TABLE public."chamados" ADD COLUMN IF NOT EXISTS "chamado_pai_id_new" BIGINT;
UPDATE public."chamados" t SET "chamado_pai_id_new" = r.id FROM public."chamados" r WHERE t."chamado_pai_id" = r.old_uuid_id;
ALTER TABLE public."chamados" DROP COLUMN IF EXISTS "chamado_pai_id";
ALTER TABLE public."chamados" RENAME COLUMN "chamado_pai_id_new" TO "chamado_pai_id";
ALTER TABLE public."chamados" ADD CONSTRAINT "chamados_chamado_pai_id_fkey" FOREIGN KEY ("chamado_pai_id") REFERENCES public."chamados"(id);
-- Updating chamados.vinculado_por pointing to profiles
ALTER TABLE public."chamados" ADD COLUMN IF NOT EXISTS "vinculado_por_new" BIGINT;
UPDATE public."chamados" t SET "vinculado_por_new" = r.id FROM public."profiles" r WHERE t."vinculado_por" = r.old_uuid_id;
ALTER TABLE public."chamados" DROP COLUMN IF EXISTS "vinculado_por";
ALTER TABLE public."chamados" RENAME COLUMN "vinculado_por_new" TO "vinculado_por";
ALTER TABLE public."chamados" ADD CONSTRAINT "chamados_vinculado_por_fkey" FOREIGN KEY ("vinculado_por") REFERENCES public."profiles"(id);
-- Updating ordens_de_servico.chamado_id pointing to chamados
ALTER TABLE public."ordens_de_servico" ADD COLUMN IF NOT EXISTS "chamado_id_new" BIGINT;
UPDATE public."ordens_de_servico" t SET "chamado_id_new" = r.id FROM public."chamados" r WHERE t."chamado_id" = r.old_uuid_id;
ALTER TABLE public."ordens_de_servico" DROP COLUMN IF EXISTS "chamado_id";
ALTER TABLE public."ordens_de_servico" RENAME COLUMN "chamado_id_new" TO "chamado_id";
ALTER TABLE public."ordens_de_servico" ADD CONSTRAINT "ordens_de_servico_chamado_id_fkey" FOREIGN KEY ("chamado_id") REFERENCES public."chamados"(id);
-- Updating ordens_de_servico.servico_id pointing to servicos
ALTER TABLE public."ordens_de_servico" ADD COLUMN IF NOT EXISTS "servico_id_new" BIGINT;
UPDATE public."ordens_de_servico" t SET "servico_id_new" = r.id FROM public."servicos" r WHERE t."servico_id" = r.old_uuid_id;
ALTER TABLE public."ordens_de_servico" DROP COLUMN IF EXISTS "servico_id";
ALTER TABLE public."ordens_de_servico" RENAME COLUMN "servico_id_new" TO "servico_id";
ALTER TABLE public."ordens_de_servico" ADD CONSTRAINT "ordens_de_servico_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES public."servicos"(id);
-- Updating transferencias_chamado.chamado_id pointing to chamados
ALTER TABLE public."transferencias_chamado" ADD COLUMN IF NOT EXISTS "chamado_id_new" BIGINT;
UPDATE public."transferencias_chamado" t SET "chamado_id_new" = r.id FROM public."chamados" r WHERE t."chamado_id" = r.old_uuid_id;
ALTER TABLE public."transferencias_chamado" DROP COLUMN IF EXISTS "chamado_id";
ALTER TABLE public."transferencias_chamado" RENAME COLUMN "chamado_id_new" TO "chamado_id";
ALTER TABLE public."transferencias_chamado" ADD CONSTRAINT "transferencias_chamado_chamado_id_fkey" FOREIGN KEY ("chamado_id") REFERENCES public."chamados"(id);
-- Updating transferencias_chamado.tecnico_anterior_id pointing to profiles
ALTER TABLE public."transferencias_chamado" ADD COLUMN IF NOT EXISTS "tecnico_anterior_id_new" BIGINT;
UPDATE public."transferencias_chamado" t SET "tecnico_anterior_id_new" = r.id FROM public."profiles" r WHERE t."tecnico_anterior_id" = r.old_uuid_id;
ALTER TABLE public."transferencias_chamado" DROP COLUMN IF EXISTS "tecnico_anterior_id";
ALTER TABLE public."transferencias_chamado" RENAME COLUMN "tecnico_anterior_id_new" TO "tecnico_anterior_id";
ALTER TABLE public."transferencias_chamado" ADD CONSTRAINT "transferencias_chamado_tecnico_anterior_id_fkey" FOREIGN KEY ("tecnico_anterior_id") REFERENCES public."profiles"(id);
-- Updating transferencias_chamado.tecnico_novo_id pointing to profiles
ALTER TABLE public."transferencias_chamado" ADD COLUMN IF NOT EXISTS "tecnico_novo_id_new" BIGINT;
UPDATE public."transferencias_chamado" t SET "tecnico_novo_id_new" = r.id FROM public."profiles" r WHERE t."tecnico_novo_id" = r.old_uuid_id;
ALTER TABLE public."transferencias_chamado" DROP COLUMN IF EXISTS "tecnico_novo_id";
ALTER TABLE public."transferencias_chamado" RENAME COLUMN "tecnico_novo_id_new" TO "tecnico_novo_id";
ALTER TABLE public."transferencias_chamado" ADD CONSTRAINT "transferencias_chamado_tecnico_novo_id_fkey" FOREIGN KEY ("tecnico_novo_id") REFERENCES public."profiles"(id);
-- Updating transferencias_chamado.transferido_por pointing to profiles
ALTER TABLE public."transferencias_chamado" ADD COLUMN IF NOT EXISTS "transferido_por_new" BIGINT;
UPDATE public."transferencias_chamado" t SET "transferido_por_new" = r.id FROM public."profiles" r WHERE t."transferido_por" = r.old_uuid_id;
ALTER TABLE public."transferencias_chamado" DROP COLUMN IF EXISTS "transferido_por";
ALTER TABLE public."transferencias_chamado" RENAME COLUMN "transferido_por_new" TO "transferido_por";
ALTER TABLE public."transferencias_chamado" ADD CONSTRAINT "transferencias_chamado_transferido_por_fkey" FOREIGN KEY ("transferido_por") REFERENCES public."profiles"(id);
-- Updating comentarios_chamado.chamado_id pointing to chamados
ALTER TABLE public."comentarios_chamado" ADD COLUMN IF NOT EXISTS "chamado_id_new" BIGINT;
UPDATE public."comentarios_chamado" t SET "chamado_id_new" = r.id FROM public."chamados" r WHERE t."chamado_id" = r.old_uuid_id;
ALTER TABLE public."comentarios_chamado" DROP COLUMN IF EXISTS "chamado_id";
ALTER TABLE public."comentarios_chamado" RENAME COLUMN "chamado_id_new" TO "chamado_id";
ALTER TABLE public."comentarios_chamado" ADD CONSTRAINT "comentarios_chamado_chamado_id_fkey" FOREIGN KEY ("chamado_id") REFERENCES public."chamados"(id);
-- Updating comentarios_chamado.autor_id pointing to profiles
ALTER TABLE public."comentarios_chamado" ADD COLUMN IF NOT EXISTS "autor_id_new" BIGINT;
UPDATE public."comentarios_chamado" t SET "autor_id_new" = r.id FROM public."profiles" r WHERE t."autor_id" = r.old_uuid_id;
ALTER TABLE public."comentarios_chamado" DROP COLUMN IF EXISTS "autor_id";
ALTER TABLE public."comentarios_chamado" RENAME COLUMN "autor_id_new" TO "autor_id";
ALTER TABLE public."comentarios_chamado" ADD CONSTRAINT "comentarios_chamado_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES public."profiles"(id);
-- Updating reembolsos.solicitante_id pointing to profiles
ALTER TABLE public."reembolsos" ADD COLUMN IF NOT EXISTS "solicitante_id_new" BIGINT;
UPDATE public."reembolsos" t SET "solicitante_id_new" = r.id FROM public."profiles" r WHERE t."solicitante_id" = r.old_uuid_id;
ALTER TABLE public."reembolsos" DROP COLUMN IF EXISTS "solicitante_id";
ALTER TABLE public."reembolsos" RENAME COLUMN "solicitante_id_new" TO "solicitante_id";
ALTER TABLE public."reembolsos" ADD CONSTRAINT "reembolsos_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES public."profiles"(id);
-- Updating reembolsos.aprovador_id pointing to profiles
ALTER TABLE public."reembolsos" ADD COLUMN IF NOT EXISTS "aprovador_id_new" BIGINT;
UPDATE public."reembolsos" t SET "aprovador_id_new" = r.id FROM public."profiles" r WHERE t."aprovador_id" = r.old_uuid_id;
ALTER TABLE public."reembolsos" DROP COLUMN IF EXISTS "aprovador_id";
ALTER TABLE public."reembolsos" RENAME COLUMN "aprovador_id_new" TO "aprovador_id";
ALTER TABLE public."reembolsos" ADD CONSTRAINT "reembolsos_aprovador_id_fkey" FOREIGN KEY ("aprovador_id") REFERENCES public."profiles"(id);
-- Updating reembolsos.pagador_id pointing to profiles
ALTER TABLE public."reembolsos" ADD COLUMN IF NOT EXISTS "pagador_id_new" BIGINT;
UPDATE public."reembolsos" t SET "pagador_id_new" = r.id FROM public."profiles" r WHERE t."pagador_id" = r.old_uuid_id;
ALTER TABLE public."reembolsos" DROP COLUMN IF EXISTS "pagador_id";
ALTER TABLE public."reembolsos" RENAME COLUMN "pagador_id_new" TO "pagador_id";
ALTER TABLE public."reembolsos" ADD CONSTRAINT "reembolsos_pagador_id_fkey" FOREIGN KEY ("pagador_id") REFERENCES public."profiles"(id);
-- Updating itens_inventario.categoria_id pointing to categorias
ALTER TABLE public."itens_inventario" ADD COLUMN IF NOT EXISTS "categoria_id_new" BIGINT;
UPDATE public."itens_inventario" t SET "categoria_id_new" = r.id FROM public."categorias" r WHERE t."categoria_id" = r.old_uuid_id;
ALTER TABLE public."itens_inventario" DROP COLUMN IF EXISTS "categoria_id";
ALTER TABLE public."itens_inventario" RENAME COLUMN "categoria_id_new" TO "categoria_id";
ALTER TABLE public."itens_inventario" ADD CONSTRAINT "itens_inventario_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES public."categorias"(id);
-- Updating itens_inventario.criado_por pointing to profiles
ALTER TABLE public."itens_inventario" ADD COLUMN IF NOT EXISTS "criado_por_new" BIGINT;
UPDATE public."itens_inventario" t SET "criado_por_new" = r.id FROM public."profiles" r WHERE t."criado_por" = r.old_uuid_id;
ALTER TABLE public."itens_inventario" DROP COLUMN IF EXISTS "criado_por";
ALTER TABLE public."itens_inventario" RENAME COLUMN "criado_por_new" TO "criado_por";
ALTER TABLE public."itens_inventario" ADD CONSTRAINT "itens_inventario_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES public."profiles"(id);
-- Updating movimentacoes_estoque.item_id pointing to itens_inventario
ALTER TABLE public."movimentacoes_estoque" ADD COLUMN IF NOT EXISTS "item_id_new" BIGINT;
UPDATE public."movimentacoes_estoque" t SET "item_id_new" = r.id FROM public."itens_inventario" r WHERE t."item_id" = r.old_uuid_id;
ALTER TABLE public."movimentacoes_estoque" DROP COLUMN IF EXISTS "item_id";
ALTER TABLE public."movimentacoes_estoque" RENAME COLUMN "item_id_new" TO "item_id";
ALTER TABLE public."movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES public."itens_inventario"(id);
-- Updating movimentacoes_estoque.realizado_por pointing to profiles
ALTER TABLE public."movimentacoes_estoque" ADD COLUMN IF NOT EXISTS "realizado_por_new" BIGINT;
UPDATE public."movimentacoes_estoque" t SET "realizado_por_new" = r.id FROM public."profiles" r WHERE t."realizado_por" = r.old_uuid_id;
ALTER TABLE public."movimentacoes_estoque" DROP COLUMN IF EXISTS "realizado_por";
ALTER TABLE public."movimentacoes_estoque" RENAME COLUMN "realizado_por_new" TO "realizado_por";
ALTER TABLE public."movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_realizado_por_fkey" FOREIGN KEY ("realizado_por") REFERENCES public."profiles"(id);
-- Updating estoque_setor.item_inventario_id pointing to itens_inventario
ALTER TABLE public."estoque_setor" ADD COLUMN IF NOT EXISTS "item_inventario_id_new" BIGINT;
UPDATE public."estoque_setor" t SET "item_inventario_id_new" = r.id FROM public."itens_inventario" r WHERE t."item_inventario_id" = r.old_uuid_id;
ALTER TABLE public."estoque_setor" DROP COLUMN IF EXISTS "item_inventario_id";
ALTER TABLE public."estoque_setor" RENAME COLUMN "item_inventario_id_new" TO "item_inventario_id";
ALTER TABLE public."estoque_setor" ADD CONSTRAINT "estoque_setor_item_inventario_id_fkey" FOREIGN KEY ("item_inventario_id") REFERENCES public."itens_inventario"(id);
-- Updating solicitacoes_compra.solicitado_por pointing to profiles
ALTER TABLE public."solicitacoes_compra" ADD COLUMN IF NOT EXISTS "solicitado_por_new" BIGINT;
UPDATE public."solicitacoes_compra" t SET "solicitado_por_new" = r.id FROM public."profiles" r WHERE t."solicitado_por" = r.old_uuid_id;
ALTER TABLE public."solicitacoes_compra" DROP COLUMN IF EXISTS "solicitado_por";
ALTER TABLE public."solicitacoes_compra" RENAME COLUMN "solicitado_por_new" TO "solicitado_por";
ALTER TABLE public."solicitacoes_compra" ADD CONSTRAINT "solicitacoes_compra_solicitado_por_fkey" FOREIGN KEY ("solicitado_por") REFERENCES public."profiles"(id);
-- Updating solicitacoes_compra.fornecedor_id pointing to fornecedores
ALTER TABLE public."solicitacoes_compra" ADD COLUMN IF NOT EXISTS "fornecedor_id_new" BIGINT;
UPDATE public."solicitacoes_compra" t SET "fornecedor_id_new" = r.id FROM public."fornecedores" r WHERE t."fornecedor_id" = r.old_uuid_id;
ALTER TABLE public."solicitacoes_compra" DROP COLUMN IF EXISTS "fornecedor_id";
ALTER TABLE public."solicitacoes_compra" RENAME COLUMN "fornecedor_id_new" TO "fornecedor_id";
ALTER TABLE public."solicitacoes_compra" ADD CONSTRAINT "solicitacoes_compra_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES public."fornecedores"(id);
-- Updating solicitacoes_compra.aprovado_por pointing to profiles
ALTER TABLE public."solicitacoes_compra" ADD COLUMN IF NOT EXISTS "aprovado_por_new" BIGINT;
UPDATE public."solicitacoes_compra" t SET "aprovado_por_new" = r.id FROM public."profiles" r WHERE t."aprovado_por" = r.old_uuid_id;
ALTER TABLE public."solicitacoes_compra" DROP COLUMN IF EXISTS "aprovado_por";
ALTER TABLE public."solicitacoes_compra" RENAME COLUMN "aprovado_por_new" TO "aprovado_por";
ALTER TABLE public."solicitacoes_compra" ADD CONSTRAINT "solicitacoes_compra_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES public."profiles"(id);
-- Updating solicitacoes_compra.rejeitado_por pointing to profiles
ALTER TABLE public."solicitacoes_compra" ADD COLUMN IF NOT EXISTS "rejeitado_por_new" BIGINT;
UPDATE public."solicitacoes_compra" t SET "rejeitado_por_new" = r.id FROM public."profiles" r WHERE t."rejeitado_por" = r.old_uuid_id;
ALTER TABLE public."solicitacoes_compra" DROP COLUMN IF EXISTS "rejeitado_por";
ALTER TABLE public."solicitacoes_compra" RENAME COLUMN "rejeitado_por_new" TO "rejeitado_por";
ALTER TABLE public."solicitacoes_compra" ADD CONSTRAINT "solicitacoes_compra_rejeitado_por_fkey" FOREIGN KEY ("rejeitado_por") REFERENCES public."profiles"(id);
-- Updating solicitacoes_compra.executado_por pointing to profiles
ALTER TABLE public."solicitacoes_compra" ADD COLUMN IF NOT EXISTS "executado_por_new" BIGINT;
UPDATE public."solicitacoes_compra" t SET "executado_por_new" = r.id FROM public."profiles" r WHERE t."executado_por" = r.old_uuid_id;
ALTER TABLE public."solicitacoes_compra" DROP COLUMN IF EXISTS "executado_por";
ALTER TABLE public."solicitacoes_compra" RENAME COLUMN "executado_por_new" TO "executado_por";
ALTER TABLE public."solicitacoes_compra" ADD CONSTRAINT "solicitacoes_compra_executado_por_fkey" FOREIGN KEY ("executado_por") REFERENCES public."profiles"(id);
-- Updating itens_solicitacao_compra.solicitacao_compra_id pointing to solicitacoes_compra
ALTER TABLE public."itens_solicitacao_compra" ADD COLUMN IF NOT EXISTS "solicitacao_compra_id_new" BIGINT;
UPDATE public."itens_solicitacao_compra" t SET "solicitacao_compra_id_new" = r.id FROM public."solicitacoes_compra" r WHERE t."solicitacao_compra_id" = r.old_uuid_id;
ALTER TABLE public."itens_solicitacao_compra" DROP COLUMN IF EXISTS "solicitacao_compra_id";
ALTER TABLE public."itens_solicitacao_compra" RENAME COLUMN "solicitacao_compra_id_new" TO "solicitacao_compra_id";
ALTER TABLE public."itens_solicitacao_compra" ADD CONSTRAINT "itens_solicitacao_compra_solicitacao_compra_id_fkey" FOREIGN KEY ("solicitacao_compra_id") REFERENCES public."solicitacoes_compra"(id);
-- Updating itens_solicitacao_compra.item_inventario_id pointing to itens_inventario
ALTER TABLE public."itens_solicitacao_compra" ADD COLUMN IF NOT EXISTS "item_inventario_id_new" BIGINT;
UPDATE public."itens_solicitacao_compra" t SET "item_inventario_id_new" = r.id FROM public."itens_inventario" r WHERE t."item_inventario_id" = r.old_uuid_id;
ALTER TABLE public."itens_solicitacao_compra" DROP COLUMN IF EXISTS "item_inventario_id";
ALTER TABLE public."itens_solicitacao_compra" RENAME COLUMN "item_inventario_id_new" TO "item_inventario_id";
ALTER TABLE public."itens_solicitacao_compra" ADD CONSTRAINT "itens_solicitacao_compra_item_inventario_id_fkey" FOREIGN KEY ("item_inventario_id") REFERENCES public."itens_inventario"(id);
-- Updating baixas.solicitado_por pointing to profiles
ALTER TABLE public."baixas" ADD COLUMN IF NOT EXISTS "solicitado_por_new" BIGINT;
UPDATE public."baixas" t SET "solicitado_por_new" = r.id FROM public."profiles" r WHERE t."solicitado_por" = r.old_uuid_id;
ALTER TABLE public."baixas" DROP COLUMN IF EXISTS "solicitado_por";
ALTER TABLE public."baixas" RENAME COLUMN "solicitado_por_new" TO "solicitado_por";
ALTER TABLE public."baixas" ADD CONSTRAINT "baixas_solicitado_por_fkey" FOREIGN KEY ("solicitado_por") REFERENCES public."profiles"(id);
-- Updating baixas.aprovado_tecnico_por pointing to profiles
ALTER TABLE public."baixas" ADD COLUMN IF NOT EXISTS "aprovado_tecnico_por_new" BIGINT;
UPDATE public."baixas" t SET "aprovado_tecnico_por_new" = r.id FROM public."profiles" r WHERE t."aprovado_tecnico_por" = r.old_uuid_id;
ALTER TABLE public."baixas" DROP COLUMN IF EXISTS "aprovado_tecnico_por";
ALTER TABLE public."baixas" RENAME COLUMN "aprovado_tecnico_por_new" TO "aprovado_tecnico_por";
ALTER TABLE public."baixas" ADD CONSTRAINT "baixas_aprovado_tecnico_por_fkey" FOREIGN KEY ("aprovado_tecnico_por") REFERENCES public."profiles"(id);
-- Updating baixas.aprovado_gestor_por pointing to profiles
ALTER TABLE public."baixas" ADD COLUMN IF NOT EXISTS "aprovado_gestor_por_new" BIGINT;
UPDATE public."baixas" t SET "aprovado_gestor_por_new" = r.id FROM public."profiles" r WHERE t."aprovado_gestor_por" = r.old_uuid_id;
ALTER TABLE public."baixas" DROP COLUMN IF EXISTS "aprovado_gestor_por";
ALTER TABLE public."baixas" RENAME COLUMN "aprovado_gestor_por_new" TO "aprovado_gestor_por";
ALTER TABLE public."baixas" ADD CONSTRAINT "baixas_aprovado_gestor_por_fkey" FOREIGN KEY ("aprovado_gestor_por") REFERENCES public."profiles"(id);
-- Updating baixas.rejeitado_por pointing to profiles
ALTER TABLE public."baixas" ADD COLUMN IF NOT EXISTS "rejeitado_por_new" BIGINT;
UPDATE public."baixas" t SET "rejeitado_por_new" = r.id FROM public."profiles" r WHERE t."rejeitado_por" = r.old_uuid_id;
ALTER TABLE public."baixas" DROP COLUMN IF EXISTS "rejeitado_por";
ALTER TABLE public."baixas" RENAME COLUMN "rejeitado_por_new" TO "rejeitado_por";
ALTER TABLE public."baixas" ADD CONSTRAINT "baixas_rejeitado_por_fkey" FOREIGN KEY ("rejeitado_por") REFERENCES public."profiles"(id);
-- Updating baixas.executado_por pointing to profiles
ALTER TABLE public."baixas" ADD COLUMN IF NOT EXISTS "executado_por_new" BIGINT;
UPDATE public."baixas" t SET "executado_por_new" = r.id FROM public."profiles" r WHERE t."executado_por" = r.old_uuid_id;
ALTER TABLE public."baixas" DROP COLUMN IF EXISTS "executado_por";
ALTER TABLE public."baixas" RENAME COLUMN "executado_por_new" TO "executado_por";
ALTER TABLE public."baixas" ADD CONSTRAINT "baixas_executado_por_fkey" FOREIGN KEY ("executado_por") REFERENCES public."profiles"(id);
-- Updating itens_baixa.baixa_id pointing to baixas
ALTER TABLE public."itens_baixa" ADD COLUMN IF NOT EXISTS "baixa_id_new" BIGINT;
UPDATE public."itens_baixa" t SET "baixa_id_new" = r.id FROM public."baixas" r WHERE t."baixa_id" = r.old_uuid_id;
ALTER TABLE public."itens_baixa" DROP COLUMN IF EXISTS "baixa_id";
ALTER TABLE public."itens_baixa" RENAME COLUMN "baixa_id_new" TO "baixa_id";
ALTER TABLE public."itens_baixa" ADD CONSTRAINT "itens_baixa_baixa_id_fkey" FOREIGN KEY ("baixa_id") REFERENCES public."baixas"(id);
-- Updating itens_baixa.item_inventario_id pointing to itens_inventario
ALTER TABLE public."itens_baixa" ADD COLUMN IF NOT EXISTS "item_inventario_id_new" BIGINT;
UPDATE public."itens_baixa" t SET "item_inventario_id_new" = r.id FROM public."itens_inventario" r WHERE t."item_inventario_id" = r.old_uuid_id;
ALTER TABLE public."itens_baixa" DROP COLUMN IF EXISTS "item_inventario_id";
ALTER TABLE public."itens_baixa" RENAME COLUMN "item_inventario_id_new" TO "item_inventario_id";
ALTER TABLE public."itens_baixa" ADD CONSTRAINT "itens_baixa_item_inventario_id_fkey" FOREIGN KEY ("item_inventario_id") REFERENCES public."itens_inventario"(id);
-- Updating chamados.usuario_id pointing to profiles
ALTER TABLE public."chamados" ADD COLUMN IF NOT EXISTS "usuario_id_new" BIGINT;
UPDATE public."chamados" t SET "usuario_id_new" = r.id FROM public."profiles" r WHERE t."usuario_id" = r.old_uuid_id;
ALTER TABLE public."chamados" DROP COLUMN IF EXISTS "usuario_id";
ALTER TABLE public."chamados" RENAME COLUMN "usuario_id_new" TO "usuario_id";
ALTER TABLE public."chamados" ADD CONSTRAINT "chamados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES public."profiles"(id);
-- Updating departamentos.organization_id pointing to organizations
ALTER TABLE public."departamentos" ADD COLUMN IF NOT EXISTS "organization_id_new" BIGINT;
UPDATE public."departamentos" t SET "organization_id_new" = r.id FROM public."organizations" r WHERE t."organization_id" = r.old_uuid_id;
ALTER TABLE public."departamentos" DROP COLUMN IF EXISTS "organization_id";
ALTER TABLE public."departamentos" RENAME COLUMN "organization_id_new" TO "organization_id";
ALTER TABLE public."departamentos" ADD CONSTRAINT "departamentos_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"(id);
-- Updating chamados_prioridades.organization_id pointing to organizations
ALTER TABLE public."chamados_prioridades" ADD COLUMN IF NOT EXISTS "organization_id_new" BIGINT;
UPDATE public."chamados_prioridades" t SET "organization_id_new" = r.id FROM public."organizations" r WHERE t."organization_id" = r.old_uuid_id;
ALTER TABLE public."chamados_prioridades" DROP COLUMN IF EXISTS "organization_id";
ALTER TABLE public."chamados_prioridades" RENAME COLUMN "organization_id_new" TO "organization_id";
ALTER TABLE public."chamados_prioridades" ADD CONSTRAINT "chamados_prioridades_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"(id);
-- Updating chamados.department_id pointing to departamentos
ALTER TABLE public."chamados" ADD COLUMN IF NOT EXISTS "department_id_new" BIGINT;
UPDATE public."chamados" t SET "department_id_new" = r.id FROM public."departamentos" r WHERE t."department_id" = r.old_uuid_id;
ALTER TABLE public."chamados" DROP COLUMN IF EXISTS "department_id";
ALTER TABLE public."chamados" RENAME COLUMN "department_id_new" TO "department_id";
ALTER TABLE public."chamados" ADD CONSTRAINT "chamados_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES public."departamentos"(id);
-- Updating chamados.prioridade_id pointing to chamados_prioridades
ALTER TABLE public."chamados" ADD COLUMN IF NOT EXISTS "prioridade_id_new" BIGINT;
UPDATE public."chamados" t SET "prioridade_id_new" = r.id FROM public."chamados_prioridades" r WHERE t."prioridade_id" = r.old_uuid_id;
ALTER TABLE public."chamados" DROP COLUMN IF EXISTS "prioridade_id";
ALTER TABLE public."chamados" RENAME COLUMN "prioridade_id_new" TO "prioridade_id";
ALTER TABLE public."chamados" ADD CONSTRAINT "chamados_prioridade_new_id_fkey" FOREIGN KEY ("prioridade_id") REFERENCES public."chamados_prioridades"(id);
-- Updating profiles.department_id pointing to departamentos
ALTER TABLE public."profiles" ADD COLUMN IF NOT EXISTS "department_id_new" BIGINT;
UPDATE public."profiles" t SET "department_id_new" = r.id FROM public."departamentos" r WHERE t."department_id" = r.old_uuid_id;
ALTER TABLE public."profiles" DROP COLUMN IF EXISTS "department_id";
ALTER TABLE public."profiles" RENAME COLUMN "department_id_new" TO "department_id";
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES public."departamentos"(id);
COMMIT;