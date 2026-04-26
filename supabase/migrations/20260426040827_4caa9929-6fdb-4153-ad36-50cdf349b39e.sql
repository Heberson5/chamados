-- Update regra enum
ALTER TYPE public.regra ADD VALUE IF NOT EXISTS 'MASTER';

-- Update is_admin function to be more inclusive
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND (regra = 'ADMIN' OR regra = 'MASTER' OR is_master = true)
  );
END;
$function$;

-- Helper for Técnico
CREATE OR REPLACE FUNCTION public.is_tecnico()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND (regra = 'TECNICO' OR regra = 'ADMIN' OR regra = 'MASTER' OR is_master = true)
  );
END;
$function$;

-- Helper for Master
CREATE OR REPLACE FUNCTION public.is_master_user()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND (regra = 'MASTER' OR is_master = true)
  );
END;
$function$;

-- Refresh chamados policies
DROP POLICY IF EXISTS "Admin full access chamados" ON public.chamados;
DROP POLICY IF EXISTS "Technicians view assigned chamados" ON public.chamados;
DROP POLICY IF EXISTS "Users create chamados" ON public.chamados;
DROP POLICY IF EXISTS "Users view own chamados" ON public.chamados;
DROP POLICY IF EXISTS "View chamados policy" ON public.chamados;
DROP POLICY IF EXISTS "Create chamados policy" ON public.chamados;
DROP POLICY IF EXISTS "Update chamados policy" ON public.chamados;

-- Master and Admin: Full access
CREATE POLICY "Admin and Master full access chamados" 
ON public.chamados FOR ALL 
USING (is_admin());

-- Technicians: Can view all and update
CREATE POLICY "Technician access chamados" 
ON public.chamados FOR SELECT 
USING (is_tecnico());

CREATE POLICY "Technician update chamados" 
ON public.chamados FOR UPDATE 
USING (is_tecnico());

-- Users: Can view own and create own
CREATE POLICY "User view own chamados" 
ON public.chamados FOR SELECT 
USING (usuario_id = auth.uid());

CREATE POLICY "User create own chamados" 
ON public.chamados FOR INSERT 
WITH CHECK (usuario_id = auth.uid());

-- User update own (only if not a technician/admin, and we'll restrict fields in UI)
CREATE POLICY "User update own chamados" 
ON public.chamados FOR UPDATE 
USING (usuario_id = auth.uid() AND NOT is_tecnico());
