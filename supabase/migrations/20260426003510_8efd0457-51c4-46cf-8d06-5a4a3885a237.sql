-- Add email_settings to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS email_settings JSONB DEFAULT '{"sender_email": "notificacoes@suaempresa.com", "sender_name": "Sistema de Chamados"}'::jsonb;

-- Ensure all existing departments have default permissions for tickets
INSERT INTO public.department_permissions (department_id, module_name, can_view, can_create, can_edit, can_delete)
SELECT d.id, 'tickets', true, true, true, false
FROM public.departments d
WHERE NOT EXISTS (
    SELECT 1 FROM public.department_permissions dp 
    WHERE dp.department_id = d.id AND dp.module_name = 'tickets'
);

-- Ensure default permissions for users module
INSERT INTO public.department_permissions (department_id, module_name, can_view, can_create, can_edit, can_delete)
SELECT d.id, 'users', true, false, false, false
FROM public.departments d
WHERE NOT EXISTS (
    SELECT 1 FROM public.department_permissions dp 
    WHERE dp.department_id = d.id AND dp.module_name = 'users'
);

-- Function to handle ticket notifications
CREATE OR REPLACE FUNCTION public.handle_ticket_notification()
RETURNS TRIGGER AS $$
DECLARE
    creator_email TEXT;
    company_email_config JSONB;
BEGIN
    -- Get the creator's email
    SELECT email INTO creator_email FROM public.profiles WHERE id = NEW.requester_id;
    
    -- Get company email config
    SELECT email_settings INTO company_email_config FROM public.organizations WHERE id = NEW.organization_id;

    -- Here we would normally call an edge function or insert into an email queue
    -- For now, let's just log it or insert into a notifications table if it exists
    -- Assuming we might want to use a dedicated table for outgoing emails
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for ticket updates
DROP TRIGGER IF EXISTS on_ticket_update_notification ON public.tickets;
CREATE TRIGGER on_ticket_update_notification
AFTER UPDATE ON public.tickets
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.handle_ticket_notification();

-- Trigger for new comments/interactions
DROP TRIGGER IF EXISTS on_ticket_comment_notification ON public.ticket_comments;
CREATE TRIGGER on_ticket_comment_notification
AFTER INSERT ON public.ticket_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_ticket_notification();
