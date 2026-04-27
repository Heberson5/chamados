CREATE OR REPLACE FUNCTION public.audit_trigger_function()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    current_user_id UUID := COALESCE(auth.uid(), (NULLIF(current_setting('app.current_user_id', true), ''))::uuid);
    current_user_email TEXT;
BEGIN
    -- Try to get email from profiles
    IF current_user_id IS NOT NULL THEN
        SELECT email INTO current_user_email FROM public.profiles WHERE id = current_user_id;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, new_data)
        VALUES (current_user_id, current_user_email, 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, old_data, new_data)
        VALUES (current_user_id, current_user_email, 'UPDATE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, old_data)
        VALUES (current_user_id, current_user_email, 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$;
