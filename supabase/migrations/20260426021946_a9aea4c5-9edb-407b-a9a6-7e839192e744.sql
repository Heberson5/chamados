-- Fix check_is_master to be more robust and explicitly avoid recursion
CREATE OR REPLACE FUNCTION public.check_is_master()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_master = true
  );
END;
$$;

-- Fix get_my_organization_id to be more robust
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- Recreate policies for profiles to be non-recursive
-- 1. Self access (highest priority)
DROP POLICY IF EXISTS "profiles_self_access" ON public.profiles;
CREATE POLICY "profiles_self_access" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = id);

-- 2. Master access (uses the robust function)
DROP POLICY IF EXISTS "profiles_master_access" ON public.profiles;
CREATE POLICY "profiles_master_access" 
ON public.profiles 
FOR SELECT 
USING (public.check_is_master());

-- 3. Org access - simplify to avoid recursion
-- Instead of calling get_my_organization_id(), we use a subquery directly 
-- but ensure it's not recursive by checking if the ID is different from the target
DROP POLICY IF EXISTS "profiles_org_access" ON public.profiles;
CREATE POLICY "profiles_org_access" 
ON public.profiles 
FOR SELECT 
USING (
  organization_id IS NOT NULL 
  AND organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- Note: The subquery (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()) 
-- is generally safe in PostgreSQL/Supabase if the planner can optimize it, 
-- but if recursion persists, the SECURITY DEFINER function is the fallback.
-- Let's stick with the function but make sure it works.
CREATE OR REPLACE FUNCTION public.is_member_of_same_org(_profile_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND organization_id = _profile_org_id
  );
END;
$$;

DROP POLICY IF EXISTS "profiles_org_access" ON public.profiles;
CREATE POLICY "profiles_org_access" 
ON public.profiles 
FOR SELECT 
USING (
  organization_id IS NOT NULL 
  AND public.is_member_of_same_org(organization_id)
);