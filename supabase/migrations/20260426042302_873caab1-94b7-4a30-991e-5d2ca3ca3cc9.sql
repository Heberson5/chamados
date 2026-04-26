-- Add attachments to comments
ALTER TABLE public.comentarios_chamado ADD COLUMN IF NOT EXISTS anexos TEXT[];

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notificacoes FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own notifications"
ON public.notificacoes FOR UPDATE
USING (auth.uid() = usuario_id);

-- Add path to audit logs for navigation tracking
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS path TEXT;

-- Add granular permissions to user_roles (optional but helpful for the request)
-- The user mentioned "create, edit, delete, inactivate"
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS can_create BOOLEAN DEFAULT TRUE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS can_edit BOOLEAN DEFAULT TRUE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS can_delete BOOLEAN DEFAULT FALSE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS can_inactivate BOOLEAN DEFAULT FALSE;
