-- Update handle_ticket_notification function
CREATE OR REPLACE FUNCTION public.handle_ticket_notification()
RETURNS TRIGGER AS $$
DECLARE
    creator_email TEXT;
    creator_name TEXT;
    company_name TEXT;
    v_org_id UUID;
    ticket_num INTEGER;
    v_subject TEXT;
    v_content TEXT;
    v_ticket_id UUID;
BEGIN
    -- Get the creator's info and org_id
    IF TG_TABLE_NAME = 'ticket_comments' THEN
        v_ticket_id := NEW.ticket_id;
        SELECT t.number, t.organization_id, p.email, p.full_name
        INTO ticket_num, v_org_id, creator_email, creator_name
        FROM public.tickets t
        JOIN public.profiles p ON p.id = t.requester_id
        WHERE t.id = v_ticket_id;
    ELSE
        v_ticket_id := NEW.id;
        v_org_id := NEW.organization_id;
        ticket_num := NEW.number;
        SELECT p.email, p.full_name
        INTO creator_email, creator_name
        FROM public.profiles p WHERE p.id = NEW.requester_id;
    END IF;

    -- If no recipient email, just return
    IF creator_email IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT name INTO company_name FROM public.organizations WHERE id = v_org_id;

    IF TG_TABLE_NAME = 'ticket_comments' THEN
        -- Only notify if it's NOT an internal note
        IF NEW.is_internal THEN
            RETURN NEW;
        END IF;
        v_subject := 'Nova interação no chamado #' || ticket_num;
        v_content := 'Olá ' || COALESCE(creator_name, 'usuário') || ', há uma nova interação no seu chamado #' || ticket_num || ' da empresa ' || company_name || '.';
    ELSE
        v_subject := 'Alteração de status no chamado #' || ticket_num;
        v_content := 'Olá ' || COALESCE(creator_name, 'usuário') || ', o status do seu chamado #' || ticket_num || ' foi alterado para ' || NEW.status || '.';
    END IF;

    -- Insert into notifications table
    INSERT INTO public.notifications (organization_id, recipient_email, subject, content, metadata)
    VALUES (v_org_id, creator_email, v_subject, v_content, jsonb_build_object(
        'ticket_id', v_ticket_id,
        'type', TG_TABLE_NAME,
        'trigger_event', TG_OP
    ));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
