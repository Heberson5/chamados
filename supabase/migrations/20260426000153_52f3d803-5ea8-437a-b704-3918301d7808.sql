-- Fix profiles_master_access to use the security definer function to avoid recursion
DROP POLICY IF EXISTS "profiles_master_access" ON public.profiles;
CREATE POLICY "profiles_master_access" 
ON public.profiles 
FOR SELECT 
USING (public.check_is_master());
