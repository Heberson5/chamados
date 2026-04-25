-- Fix log_user_action to be SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.log_user_action(p_action text)
RETURNS void AS $$
DECLARE
    current_user_id UUID := auth.uid();
    current_user_email TEXT;
BEGIN
    -- Only log if there is an authenticated user
    IF current_user_id IS NOT NULL THEN
        SELECT email INTO current_user_email FROM public.profiles WHERE id = current_user_id;
        
        INSERT INTO public.audit_logs (user_id, user_email, action, timestamp)
        VALUES (current_user_id, current_user_email, p_action, now());
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add INSERT policy for audit_logs so the function (even if not sec def) or users can log actions
-- Actually, since we made it SECURITY DEFINER, we don't strictly need this, but it's good practice
-- if we want to allow direct inserts from the client (not recommended but sometimes used).
-- We'll just rely on the SECURITY DEFINER function for now.

-- Improve profiles RLS to prevent any potential issues
DROP POLICY IF EXISTS "profiles_self_access" ON public.profiles;
CREATE POLICY "profiles_self_access" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ensure profiles_master_access and profiles_org_access are only for SELECT and use the sec def functions
DROP POLICY IF EXISTS "profiles_master_access" ON public.profiles;
CREATE POLICY "profiles_master_access" 
ON public.profiles 
FOR SELECT 
USING (public.check_is_master());

DROP POLICY IF EXISTS "profiles_org_access" ON public.profiles;
CREATE POLICY "profiles_org_access" 
ON public.profiles 
FOR SELECT 
USING (
  organization_id IS NOT NULL 
  AND organization_id = public.get_my_organization_id()
);
