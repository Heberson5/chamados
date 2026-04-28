-- Add column to profiles
ALTER TABLE public.profiles ADD COLUMN pode_receber_chamados BOOLEAN DEFAULT false;

-- Update is_tecnico function to include users with the flag
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
     AND (
       regra = 'TECNICO' 
       OR regra = 'ADMIN' 
       OR regra = 'MASTER' 
       OR is_master = true 
       OR pode_receber_chamados = true
     )
   );
 END;
 $function$;
