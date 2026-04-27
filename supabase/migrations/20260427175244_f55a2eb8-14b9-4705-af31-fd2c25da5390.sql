-- Update the generate_os_number function to include the "OS-" prefix
CREATE OR REPLACE FUNCTION public.generate_os_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- If OS is null, empty or just a number (missing prefix), generate with prefix
    IF NEW.os IS NULL OR NEW.os = '' OR NEW.os ~ '^[0-9]+$' THEN
        NEW.os := 'OS-' || nextval('public.chamados_os_seq')::text;
    END IF;
    RETURN NEW;
END;
$function$;

-- Update existing OS numbers to have the "OS-" prefix
DO $$
DECLARE
    r RECORD;
    numeric_os TEXT;
BEGIN
    FOR r IN SELECT id, os FROM public.chamados ORDER BY gerado_em ASC LOOP
        -- Extract only numbers if it was already "OS-X" or keep if it was just "X"
        numeric_os := regexp_replace(r.os, '[^0-9]', '', 'g');
        IF numeric_os = '' THEN
            -- Fallback if something went wrong
            numeric_os := nextval('public.chamados_os_seq')::text;
        END IF;
        UPDATE public.chamados SET os = 'OS-' || numeric_os WHERE id = r.id;
    END LOOP;
END $$;