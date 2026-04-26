-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies for system_settings
CREATE POLICY "System settings are viewable by authenticated users"
ON public.system_settings FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "System settings are manageable by admins"
ON public.system_settings FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (regra IN ('ADMIN', 'MASTER') OR is_master = true)
));

-- Update chamados FK to SET NULL on delete instead of CASCADE
ALTER TABLE public.chamados DROP CONSTRAINT IF EXISTS chamados_usuario_id_fkey;
ALTER TABLE public.chamados 
ADD CONSTRAINT chamados_usuario_id_fkey 
FOREIGN KEY (usuario_id) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- Insert default kanban settings
INSERT INTO public.system_settings (key, value)
VALUES ('kanban_config', '[
    {"id": "ABERTO", "title": "Abertos", "color": "bg-blue-500/10 border-blue-500/20"},
    {"id": "EM_ATENDIMENTO", "title": "Em Atendimento", "color": "bg-amber-500/10 border-amber-500/20"},
    {"id": "ENCERRADO", "title": "Encerrados", "color": "bg-emerald-500/10 border-emerald-500/20"}
]')
ON CONFLICT (key) DO NOTHING;

-- Insert default report settings
INSERT INTO public.system_settings (key, value)
VALUES ('report_layout', '{
    "showLogo": true,
    "headerColor": "#000000",
    "footerText": "Help-Me System - Relatório Operacional"
}')
ON CONFLICT (key) DO NOTHING;
