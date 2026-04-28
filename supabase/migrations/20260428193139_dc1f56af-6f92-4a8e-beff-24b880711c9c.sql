-- Update departamentos policies
DROP POLICY IF EXISTS "Users can view their organization departments" ON public.departamentos;
CREATE POLICY "Users can view their organization departments"
ON public.departamentos
FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.is_master = true OR profiles.regra = 'MASTER')))
  OR 
  (auth.uid() IN (SELECT id FROM profiles WHERE profiles.organization_id = departamentos.organization_id))
);

-- Ensure profiles can be viewed by members of same org OR master
DROP POLICY IF EXISTS "profiles_org_access" ON public.profiles;
CREATE POLICY "profiles_org_access"
ON public.profiles
FOR SELECT
USING (
  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND (p.is_master = true OR p.regra = 'MASTER')))
  OR
  ((organization_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.organization_id = profiles.organization_id
  )))
);
