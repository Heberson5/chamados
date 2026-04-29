-- 1. PREPARATION: Profiles and Auth Link
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID;
UPDATE public.profiles SET user_id = id WHERE user_id IS NULL AND id IS NOT NULL;

-- 2. Update Functions
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND (regra = 'ADMIN'::public.regra OR regra = 'MASTER'::public.regra OR is_master = true));
END;
$$;

CREATE OR REPLACE FUNCTION public.is_tecnico() RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
 BEGIN
   RETURN EXISTS (
     SELECT 1 FROM public.profiles
     WHERE user_id = auth.uid()
     AND (
       regra = 'TECNICO' 
       OR regra = 'ADMIN' 
       OR regra = 'MASTER' 
       OR is_master = true 
       OR pode_receber_chamados = true
     )
   );
 END;
$$;
