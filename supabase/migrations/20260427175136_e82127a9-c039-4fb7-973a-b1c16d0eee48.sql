-- Reset the OS sequence to 1
CREATE SEQUENCE IF NOT EXISTS public.chamados_os_seq START 1;
SELECT setval('public.chamados_os_seq', 1, false);

-- Function to generate sequential OS number (purely numeric)
CREATE OR REPLACE FUNCTION public.generate_os_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Force new sequential OS if it's missing or in old format
    IF NEW.os IS NULL OR NEW.os = '' OR NEW.os LIKE 'OS-%' THEN
        NEW.os := nextval('public.chamados_os_seq')::text;
    END IF;
    RETURN NEW;
END;
$function$;

-- Update existing OS numbers to be sequential starting from 1
DO $$
DECLARE
    r RECORD;
    counter INT := 1;
BEGIN
    FOR r IN SELECT id FROM public.chamados ORDER BY gerado_em ASC LOOP
        UPDATE public.chamados SET os = counter::text WHERE id = r.id;
        counter := counter + 1;
    END LOOP;
    PERFORM setval('public.chamados_os_seq', counter, false);
END $$;