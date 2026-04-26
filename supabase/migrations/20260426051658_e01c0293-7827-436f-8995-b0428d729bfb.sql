-- Add new values to chamado_status enum
-- Since we can't easily ALTER TYPE inside a transaction for enums in some PG versions, 
-- we use this approach if it's not already there.
ALTER TYPE public.chamado_status ADD VALUE IF NOT EXISTS 'PAUSADO';
ALTER TYPE public.chamado_status ADD VALUE IF NOT EXISTS 'AGUARDANDO_USUARIO';

-- Add columns for time tracking
ALTER TABLE public.chamados 
ADD COLUMN IF NOT EXISTS atendido_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pausado_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS aguardando_usuario_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tempo_total_pausado INTEGER DEFAULT 0, -- in seconds
ADD COLUMN IF NOT EXISTS tempo_total_aguardando_usuario INTEGER DEFAULT 0; -- in seconds

-- Update system settings with default Kanban config if it doesn't exist or update it
-- We'll do this in code later to be safer, or here as an UPSERT
INSERT INTO public.system_settings (key, value)
VALUES ('kanban_config', '[
  {"id": "ABERTO", "title": "Aguardando", "color_hex": "#3b82f6"},
  {"id": "EM_ATENDIMENTO", "title": "Atendendo", "color_hex": "#f59e0b"},
  {"id": "PAUSADO", "title": "Pausado", "color_hex": "#64748b"},
  {"id": "AGUARDANDO_USUARIO", "title": "Aguardando o Usuário", "color_hex": "#8b5cf6"},
  {"id": "ENCERRADO", "title": "Encerrados", "color_hex": "#10b981"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
