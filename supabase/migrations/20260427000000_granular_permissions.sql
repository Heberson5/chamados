-- Adicionar coluna permissions se não existir na tabela role_definitions
-- (Assumindo que já existe conforme visto no código do frontend, mas garantindo consistência)

-- Definir a estrutura de permissões granulares sugerida
-- Dashboard: dashboard:visualizar, dashboard:exportar
-- Chamados: chamados:visualizar, chamados:criar, chamados:editar, chamados:encerrar, chamados:reabrir, chamados:excluir
-- Inventário: inventario:visualizar, inventario:criar, inventario:editar, inventario:excluir
-- Financeiro: financeiro:visualizar, financeiro:criar, financeiro:editar, financeiro:excluir
-- Usuários: usuarios:visualizar, usuarios:criar, usuarios:editar, usuarios:excluir, usuarios:alterar_senha
-- Permissões: permissoes:visualizar, permissoes:criar, permissoes:editar, permissoes:excluir
-- Relatórios: relatorios:visualizar, relatorios:exportar_pdf, relatorios:exportar_excel
-- Configurações: configuracoes:visualizar, configuracoes:geral, configuracoes:layout, configuracoes:e-mail, configuracoes:seguranca
-- Auditoria: audit:visualizar, audit:exportar

-- Atualizar definições padrão se existirem
DO $$
BEGIN
    -- Se existirem as roles padrão, vamos garantir que elas tenham as permissões básicas
    UPDATE public.role_definitions SET permissions = ARRAY['dashboard', 'dashboard:visualizar', 'chamados', 'chamados:visualizar', 'chamados:criar', 'chamados:editar'] WHERE name ILIKE 'Usuário';
    UPDATE public.role_definitions SET permissions = ARRAY['dashboard', 'dashboard:visualizar', 'chamados', 'chamados:visualizar', 'chamados:criar', 'chamados:editar', 'chamados:encerrar', 'relatorios', 'relatorios:visualizar', 'inventario', 'inventario:visualizar'] WHERE name ILIKE 'Técnico';
    UPDATE public.role_definitions SET permissions = ARRAY['Acesso Total'] WHERE name ILIKE 'Administrador' OR name ILIKE 'Master';
END $$;
