-- Drop existing policies for departamentos
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departamentos;
DROP POLICY IF EXISTS "Users can view their organization departments" ON public.departamentos;

-- Policy for Master users (full access)
CREATE POLICY "Master users can manage all departments"
ON public.departamentos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_master = true OR profiles.regra = 'MASTER')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_master = true OR profiles.regra = 'MASTER')
  )
);

-- Policy for Admins (manage their organization departments)
CREATE POLICY "Admins can manage organization departments"
ON public.departamentos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.regra = 'ADMIN'
    AND (profiles.organization_id IS NOT DISTINCT FROM departamentos.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.regra = 'ADMIN'
    AND (profiles.organization_id IS NOT DISTINCT FROM departamentos.organization_id)
  )
);

-- Policy for regular users (view their organization departments)
CREATE POLICY "Users can view organization departments"
ON public.departamentos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.organization_id IS NOT DISTINCT FROM departamentos.organization_id)
  )
);
