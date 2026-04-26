-- Reset the OS sequence to 1
SELECT setval('public.chamados_os_seq', 1, false);

-- Update the generate_os_number function to use the sequence and not add 'OS-' prefix by default if it's supposed to be just a number
-- Or if they want 'OS-1', we can adjust. The user said "iniciado pelo número 1 e assim por diante". 
-- I will keep it simple as a string representation of the number.
CREATE OR REPLACE FUNCTION public.generate_os_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.os IS NULL OR NEW.os = '' THEN
        NEW.os := nextval('public.chamados_os_seq')::text;
    END IF;
    RETURN NEW;
END;
$function$;

-- Add 'reaberto' column to 'chamados'
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS reaberto BOOLEAN DEFAULT FALSE;

-- Enable real-time for 'chamados' and 'comentarios_chamado'
-- First, ensure the publication exists or create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add tables to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE chamados;
ALTER PUBLICATION supabase_realtime ADD TABLE comentarios_chamado;
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
