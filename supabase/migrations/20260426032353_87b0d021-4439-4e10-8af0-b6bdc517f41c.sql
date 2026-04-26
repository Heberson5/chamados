-- Re-create is_admin with search_path for security
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

-- Re-create check_is_master with search_path for security
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

-- Update all policies that use the recursive check
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (qual ILIKE '%EXISTS (SELECT 1 FROM profiles%' OR with_check ILIKE '%EXISTS (SELECT 1 FROM profiles%')
        AND policyname NOT IN ('Admin full access profiles', 'Admin full access chamados') -- already handled or special
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
        
        -- Most of these are "Admin All" or "Admins can manage"
        IF pol.policyname ILIKE '%master%' THEN
            EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (check_is_master())', pol.policyname, pol.tablename);
        ELSE
            EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (is_admin())', pol.policyname, pol.tablename);
        END IF;
    END LOOP;
END $$;
