-- Drop all existing policies on profiles to start clean and avoid conflicts
DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_during_signup" ON public.profiles;
DROP POLICY IF EXISTS "profiles_master_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_org_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_access" ON public.profiles;

-- 1. Policy for users to view/manage their own profile (Direct check, no recursion)
CREATE POLICY "profiles_self_all" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2. Policy for Admins and Masters to view all profiles (Uses SECURITY DEFINER function to avoid recursion)
CREATE POLICY "profiles_admin_select" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin());

-- 3. Policy for Admins and Masters to manage all profiles (Uses SECURITY DEFINER function to avoid recursion)
CREATE POLICY "profiles_admin_manage" 
ON public.profiles 
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Policy for insertion during signup (Direct check, no recursion)
CREATE POLICY "profiles_signup_insert" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Ensure the helper functions are correctly defined with explicit casts for the enum
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND (regra = 'ADMIN'::public.regra OR regra = 'MASTER'::public.regra OR is_master = true)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_is_master()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (is_master = true OR regra = 'MASTER'::public.regra)
  );
END;
$$;
