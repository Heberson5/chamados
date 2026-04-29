BEGIN;

-- 1. Fix audit_logs table structure
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE public.audit_logs ALTER COLUMN record_id TYPE TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS auth_user_id UUID;
UPDATE public.audit_logs SET auth_user_id = user_id WHERE auth_user_id IS NULL AND (user_id IS NOT NULL OR auth_user_id IS NULL);
ALTER TABLE public.audit_logs ALTER COLUMN user_id TYPE BIGINT USING NULL;

-- 2. Update audit_trigger_function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    current_auth_user_id UUID := COALESCE(auth.uid(), (NULLIF(current_setting('app.current_user_id', true), ''))::uuid);
    current_user_id BIGINT;
    current_user_email TEXT;
BEGIN
    -- Try to get numeric ID and email from profiles
    IF current_auth_user_id IS NOT NULL THEN
        SELECT id, email INTO current_user_id, current_user_email FROM public.profiles WHERE user_id = current_auth_user_id;
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

COMMIT;
