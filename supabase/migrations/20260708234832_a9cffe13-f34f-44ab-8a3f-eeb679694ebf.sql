CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    current_auth_user_id UUID := COALESCE(auth.uid(), (NULLIF(current_setting('app.current_user_id', true), ''))::uuid);
    current_user_id BIGINT;
    current_user_email TEXT;
BEGIN
    -- Try to get numeric profile ID and email from profiles.
    -- audit_logs.user_id is BIGINT, so use profiles.id_numerico instead of profiles.id (UUID).
    IF current_auth_user_id IS NOT NULL THEN
        SELECT id_numerico, email
          INTO current_user_id, current_user_email
          FROM public.profiles
         WHERE user_id = current_auth_user_id OR id = current_auth_user_id
         LIMIT 1;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (user_id, auth_user_id, user_email, action, table_name, record_id, new_data)
        VALUES (current_user_id, current_auth_user_id, current_user_email, 'INSERT', TG_TABLE_NAME, NEW.id::TEXT, to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (user_id, auth_user_id, user_email, action, table_name, record_id, old_data, new_data)
        VALUES (current_user_id, current_auth_user_id, current_user_email, 'UPDATE', TG_TABLE_NAME, OLD.id::TEXT, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (user_id, auth_user_id, user_email, action, table_name, record_id, old_data)
        VALUES (current_user_id, current_auth_user_id, current_user_email, 'DELETE', TG_TABLE_NAME, OLD.id::TEXT, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.audit_trigger_function() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_trigger_function() TO service_role;