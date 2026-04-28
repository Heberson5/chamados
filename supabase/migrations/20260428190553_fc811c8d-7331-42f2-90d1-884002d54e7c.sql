-- Create departamentos table
CREATE TABLE IF NOT EXISTS public.departamentos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id),
    nome TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for departamentos
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization departments" ON public.departamentos;
CREATE POLICY "Users can view their organization departments"
ON public.departamentos
FOR SELECT
USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE organization_id = public.departamentos.organization_id
));

DROP POLICY IF EXISTS "Admins can manage departments" ON public.departamentos;
CREATE POLICY "Admins can manage departments"
ON public.departamentos
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (is_master = true OR regra = 'ADMIN')
    )
);

-- Create chamados_prioridades table
CREATE TABLE IF NOT EXISTS public.chamados_prioridades (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id),
    nome TEXT NOT NULL,
    cor TEXT NOT NULL DEFAULT '#6e59ff',
    ordem INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for chamados_prioridades
ALTER TABLE public.chamados_prioridades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone in org can view priorities" ON public.chamados_prioridades;
CREATE POLICY "Everyone in org can view priorities"
ON public.chamados_prioridades
FOR SELECT
USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE organization_id = public.chamados_prioridades.organization_id
));

DROP POLICY IF EXISTS "Admins can manage priorities" ON public.chamados_prioridades;
CREATE POLICY "Admins can manage priorities"
ON public.chamados_prioridades
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (is_master = true OR regra = 'ADMIN')
    )
);

-- Update profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_departments UUID[] DEFAULT '{}';

-- Add department_id to chamados
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departamentos(id);

-- Migration for priorities: 
-- 1. Create temporary column
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS prioridade_new_id UUID REFERENCES public.chamados_prioridades(id);

-- (Inserting default priorities if table is empty)
DO $$
DECLARE
    org_id UUID;
BEGIN
    SELECT id INTO org_id FROM public.organizations LIMIT 1;
    IF org_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.chamados_prioridades LIMIT 1) THEN
        INSERT INTO public.chamados_prioridades (organization_id, nome, cor, ordem) VALUES
        (org_id, 'Baixa', '#34d399', 1),
        (org_id, 'Média', '#fbbf24', 2),
        (org_id, 'Alta', '#f87171', 3),
        (org_id, 'Urgente', '#ef4444', 4);
    END IF;
END $$;

-- Update chamados RLS for department-based access
DROP POLICY IF EXISTS "Admin and Master access chamados" ON public.chamados;
DROP POLICY IF EXISTS "Admin and Master full access chamados" ON public.chamados;

CREATE POLICY "Admin and Master access chamados"
ON public.chamados
FOR ALL
USING (
    is_admin() OR 
    department_id IN (
        SELECT unnest(admin_departments) FROM public.profiles WHERE id = auth.uid()
    )
);

-- Update interactions RLS
ALTER TABLE public.comentarios_chamado ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view interactions of accessible tickets" ON public.comentarios_chamado;
CREATE POLICY "Users can view interactions of accessible tickets"
ON public.comentarios_chamado
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chamados c
        WHERE c.id = chamado_id
        AND (
            c.usuario_id = auth.uid() OR 
            c.tecnico_id = auth.uid() OR 
            is_admin() OR
            c.department_id IN (
                SELECT unnest(admin_departments) FROM public.profiles WHERE id = auth.uid()
            )
        )
    )
);

DROP POLICY IF EXISTS "Users can insert interactions on their tickets" ON public.comentarios_chamado;
CREATE POLICY "Users can insert interactions on their tickets"
ON public.comentarios_chamado
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.chamados c
        WHERE c.id = chamado_id
        AND (
            c.usuario_id = auth.uid() OR 
            c.tecnico_id = auth.uid() OR 
            is_admin()
        )
    )
);
