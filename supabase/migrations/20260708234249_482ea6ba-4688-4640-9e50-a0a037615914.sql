DROP POLICY IF EXISTS "Role definitions are manageable by Master/Admin users" ON public.role_definitions;

CREATE POLICY "Role definitions are manageable by Master/Admin users"
ON public.role_definitions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE (p.id = auth.uid() OR p.user_id = auth.uid())
      AND (p.regra = 'MASTER'::regra OR p.regra = 'ADMIN'::regra OR p.is_master = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE (p.id = auth.uid() OR p.user_id = auth.uid())
      AND (p.regra = 'MASTER'::regra OR p.regra = 'ADMIN'::regra OR p.is_master = true)
  )
);