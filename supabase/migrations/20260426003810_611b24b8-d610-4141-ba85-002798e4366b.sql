-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, sent, error
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Master users can view all notifications
CREATE POLICY "Master users view notifications" 
ON public.notifications FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = true));

-- Organization members can view their own org's notifications
CREATE POLICY "Org members view notifications" 
ON public.notifications FOR SELECT 
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Update handle_ticket_notification function to insert into notifications table
CREATE OR REPLACE FUNCTION public.handle_ticket_notification()
RETURNS TRIGGER AS $$
DECLARE
    creator_email TEXT;
    creator_name TEXT;
    company_name TEXT;
    ticket_num INTEGER;
    v_subject TEXT;
    v_content TEXT;
BEGIN
    -- Get the creator's info
    IF TG_TABLE_NAME = 'ticket_comments' THEN
        SELECT p.email, p.full_name, t.number, t.organization_id 
        INTO creator_email, creator_name, ticket_num, NEW.organization_id -- This might fail if organization_id is not in comment NEW
        FROM public.tickets t
        JOIN public.profiles p ON p.id = t.requester_id
        WHERE t.id = NEW.ticket_id;
    ELSE
        SELECT p.email, p.full_name, NEW.number 
        INTO creator_email, creator_name, ticket_num
        FROM public.profiles p WHERE p.id = NEW.requester_id;
    END IF;

    SELECT name INTO company_name FROM public.organizations WHERE id = NEW.organization_id;

    IF TG_TABLE_NAME = 'ticket_comments' THEN
        v_subject := 'Nova interação no chamado #' || ticket_num;
        v_content := 'Olá ' || COALESCE(creator_name, 'usuário') || ', há uma nova interação no seu chamado #' || ticket_num || ' da empresa ' || company_name || '.';
    ELSE
        v_subject := 'Alteração de status no chamado #' || ticket_num;
        v_content := 'Olá ' || COALESCE(creator_name, 'usuário') || ', o status do seu chamado #' || ticket_num || ' foi alterado para ' || NEW.status || '.';
    END IF;

    -- Insert into notifications table
    INSERT INTO public.notifications (organization_id, recipient_email, subject, content, metadata)
    VALUES (NEW.organization_id, creator_email, v_subject, v_content, jsonb_build_object(
        'ticket_id', COALESCE(NEW.id, (SELECT id FROM public.tickets WHERE id = NEW.ticket_id)),
        'type', TG_TABLE_NAME
    ));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
