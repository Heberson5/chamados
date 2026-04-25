-- Drop existing policies on profiles
DROP POLICY IF EXISTS "view profiles" ON public.profiles;
DROP POLICY IF EXISTS "update profiles" ON public.profiles;
DROP POLICY IF EXISTS "insert profiles" ON public.profiles;

-- Create new, simpler policies
-- 1. Users can always see and update their own profile
CREATE POLICY "profiles_self_access" ON public.profiles
FOR ALL USING (auth.uid() = id);

-- 2. Master users can see everything
-- We use a subquery that is as simple as possible
CREATE POLICY "profiles_master_access" ON public.profiles
FOR SELECT USING (
  (SELECT is_master FROM public.profiles WHERE id = auth.uid()) = true
);

-- 3. Organization members can see each other
CREATE POLICY "profiles_org_access" ON public.profiles
FOR SELECT USING (
  organization_id IS NOT NULL AND 
  organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- 4. Allow insert during signup (when user is not yet in profiles)
CREATE POLICY "profiles_insert_during_signup" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);
