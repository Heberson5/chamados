-- Create sequence for OS numbers
CREATE SEQUENCE IF NOT EXISTS chamados_os_seq START 1;

-- Function to generate sequential OS number
CREATE OR REPLACE FUNCTION generate_os_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.os IS NULL OR NEW.os = '' OR NEW.os LIKE 'OS-%' THEN
        NEW.os := nextval('chamados_os_seq')::text;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to apply sequential OS number
DROP TRIGGER IF EXISTS trg_generate_os_number ON chamados;
CREATE TRIGGER trg_generate_os_number
BEFORE INSERT ON chamados
FOR EACH ROW
EXECUTE FUNCTION generate_os_number();

-- Update existing OS numbers to be sequential (optional but good for consistency)
-- DO $$
-- DECLARE
--     r RECORD;
--     counter INT := 1;
-- BEGIN
--     FOR r IN SELECT id FROM chamados ORDER BY gerado_em ASC LOOP
--         UPDATE chamados SET os = counter::text WHERE id = r.id;
--         counter := counter + 1;
--     END LOOP;
--     PERFORM setval('chamados_os_seq', counter);
-- END $$;

-- Table for Dynamic Role Definitions
CREATE TABLE IF NOT EXISTS public.role_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    bg_color TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    can_create BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT true,
    can_delete BOOLEAN DEFAULT false,
    can_inactivate BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for role_definitions
ALTER TABLE public.role_definitions ENABLE ROW LEVEL SECURITY;

-- Policies for role_definitions
CREATE POLICY "Role definitions are viewable by all authenticated users"
ON public.role_definitions FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Role definitions are manageable by Master/Admin users"
ON public.role_definitions FOR ALL
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (regra = 'MASTER' OR regra = 'ADMIN' OR is_master = true)
));

-- Insert initial roles
INSERT INTO public.role_definitions (name, description, icon, color, bg_color, permissions, can_create, can_edit, can_delete, can_inactivate)
VALUES 
('Master', 'Acesso total ao sistema, todas as configurações e gerenciamento de administradores.', 'Crown', 'text-purple-500', 'bg-purple-500/10', '["Acesso Total", "Gerenciar Administradores", "Configurações do Sistema", "Todos os Relatórios"]', true, true, true, true),
('Administrador', 'Gerencia usuários, chamados e relatórios. Não tem acesso às configurações críticas do sistema.', 'Shield', 'text-blue-500', 'bg-blue-500/10', '["Gerenciar Usuários", "Gerenciar Chamados", "Ver Relatórios", "Gerenciar Categorias"]', true, true, true, true),
('Técnico', 'Responsável por atender e encerrar chamados atribuídos ou disponíveis.', 'Hammer', 'text-amber-500', 'bg-amber-500/10', '["Atender Chamados", "Encerrar Chamados", "Ver Seus Relatórios", "Adicionar Comentários"]', true, true, false, false),
('Usuário', 'Pode abrir chamados e acompanhar o progresso dos seus próprios pedidos.', 'User', 'text-slate-500', 'bg-slate-500/10', '["Abrir Chamados", "Ver Seus Chamados", "Comentar Seus Chamados", "Avaliar Atendimento"]', true, true, false, false)
ON CONFLICT (name) DO NOTHING;

-- Ensure system_settings has necessary keys
INSERT INTO public.system_settings (key, value)
VALUES 
('email_sender', '"suporte@exemplo.com"'),
('email_templates', '[
    {"id": "status_change", "name": "Alteração de Status", "subject": "Status do seu chamado {os} alterado", "body": "Olá {user},\n\nO status do seu chamado {os} ({titulo}) foi alterado para {status}.\n\nAtenciosamente,\nEquipe de Suporte"},
    {"id": "new_ticket", "name": "Abertura de Chamado", "subject": "Novo chamado aberto: {os}", "body": "Olá {user},\n\nSeu chamado {os} ({titulo}) foi aberto com sucesso.\n\nDescrição: {descricao}\n\nAtenciosamente,\nEquipe de Suporte"},
    {"id": "new_interaction", "name": "Novas Interações", "subject": "Nova interação no chamado {os}", "body": "Olá {user},\n\nHá uma nova interação no seu chamado {os} ({titulo}).\n\nComentário: {comentario}\n\nAtenciosamente,\nEquipe de Suporte"}
]')
ON CONFLICT (key) DO NOTHING;
