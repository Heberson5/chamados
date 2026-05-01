-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- RPC to check if a password exists in history
CREATE OR REPLACE FUNCTION public.check_password_history(p_user_id UUID, p_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    h RECORD;
BEGIN
    FOR h IN SELECT password_hash FROM public.password_history WHERE user_id = p_user_id LOOP
        IF h.password_hash = crypt(p_password, h.password_hash) THEN
            RETURN TRUE;
        END IF;
    END LOOP;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to store a new password hash in history
CREATE OR REPLACE FUNCTION public.store_password_history(p_user_id UUID, p_password TEXT)
RETURNS VOID AS $$
DECLARE
    v_history_limit INTEGER := 5; -- Default limit
BEGIN
    -- Insert new hash
    INSERT INTO public.password_history (user_id, password_hash)
    VALUES (p_user_id, crypt(p_password, gen_salt('bf')));

    -- Remove old entries if they exceed the limit
    DELETE FROM public.password_history
    WHERE id IN (
        SELECT id FROM public.password_history
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        OFFSET v_history_limit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
