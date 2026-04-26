CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND regra = 'ADMIN'
  );
END;
$$;

-- Update profiles table policies
DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
CREATE POLICY "Admin full access profiles" 
ON public.profiles 
FOR ALL 
USING (is_admin());

-- Update chamados table policies
DROP POLICY IF EXISTS "Admin full access chamados" ON public.chamados;
CREATE POLICY "Admin full access chamados" 
ON public.chamados 
FOR ALL 
USING (is_admin());
