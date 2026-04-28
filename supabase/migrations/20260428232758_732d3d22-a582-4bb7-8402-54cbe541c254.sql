-- Create system_manuals table
CREATE TABLE IF NOT EXISTS public.system_manuals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    role_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_manuals ENABLE ROW LEVEL SECURITY;

-- Policy: Master can do everything
CREATE POLICY "Master can do everything on manuals" 
ON public.system_manuals 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND (p.is_master = true OR p.regra = 'MASTER')
    )
);

-- Policy: Administrador can view all except Master manual
CREATE POLICY "Administrador can view non-master manuals" 
ON public.system_manuals 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.regra = 'ADMIN'
    ) AND role_key != 'MASTER'
);

-- Policy: Administrador can edit all except Master manual
CREATE POLICY "Administrador can edit non-master manuals" 
ON public.system_manuals 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.regra = 'ADMIN'
    ) AND role_key != 'MASTER'
);

-- Policy: Users can only view their own manual
CREATE POLICY "Users can view their own manual" 
ON public.system_manuals 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND (
            (p.regra = 'TECNICO' AND role_key = 'TECNICO') OR
            (p.regra = 'USUARIO' AND role_key = 'USUARIO') OR
            (p.regra = 'GESTOR' AND role_key = 'USUARIO')
        )
    )
);

-- Insert default manuals
INSERT INTO public.system_manuals (role_key, title, content) VALUES
('MASTER', 'Manual do Usuário Master', '<h1>Bem-vindo, Master</h1><p>Você tem controle total sobre o sistema. Gerencie permissões, usuários e configurações globais.</p>'),
('ADMIN', 'Manual do Administrador', '<h1>Bem-vindo, Administrador</h1><p>Você pode gerenciar usuários da sua organização, acompanhar chamados e visualizar relatórios detalhados.</p>'),
('TECNICO', 'Manual do Técnico', '<h1>Bem-vindo, Técnico</h1><p>Seu foco é no atendimento de chamados. Utilize o Kanban para organizar suas tarefas e registre todas as interações.</p>'),
('USUARIO', 'Manual do Usuário', '<h1>Bem-vindo, Usuário</h1><p>Aprenda como abrir novos chamados, anexar arquivos e acompanhar o status de suas solicitações.</p>')
ON CONFLICT (role_key) DO NOTHING;

-- Function to safely add permission to JSONB array
CREATE OR REPLACE FUNCTION public.add_permission_to_role(role_name_input TEXT, permission_to_add TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.role_definitions
    SET permissions = (
        SELECT jsonb_agg(DISTINCT elem)
        FROM (
            SELECT jsonb_array_elements_text(permissions) AS elem
            FROM public.role_definitions
            WHERE name = role_name_input
            UNION
            SELECT permission_to_add
        ) sub
    )
    WHERE name = role_name_input;
END;
$$ LANGUAGE plpgsql;

-- Update permissions
SELECT public.add_permission_to_role('Master', 'ajuda');
SELECT public.add_permission_to_role('Master', 'departamentos');
SELECT public.add_permission_to_role('Administrador', 'ajuda');
SELECT public.add_permission_to_role('Administrador', 'departamentos');
SELECT public.add_permission_to_role('Técnico', 'ajuda');
SELECT public.add_permission_to_role('Usuário', 'ajuda');

DROP FUNCTION public.add_permission_to_role(TEXT, TEXT);
