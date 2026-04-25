-- Create a security definer function to check if the current user is a master user
-- This avoids recursion because security definer functions bypass RLS
CREATE OR REPLACE FUNCTION public.check_is_master()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_master = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a security definer function to get the current user's organization_id
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop the problematic policies
DROP POLICY IF EXISTS "profiles_master_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_org_access" ON public.profiles;

-- Re-create the policies using the functions
CREATE POLICY "profiles_master_access" 
ON public.profiles 
FOR SELECT 
USING (public.check_is_master());

CREATE POLICY "profiles_org_access" 
ON public.profiles 
FOR SELECT 
USING (
  organization_id IS NOT NULL 
  AND organization_id = public.get_my_organization_id()
);
