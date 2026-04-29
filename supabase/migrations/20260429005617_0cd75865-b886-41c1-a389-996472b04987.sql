DO $$ 
DECLARE 
    t TEXT;
    c TEXT;
    max_val BIGINT;
BEGIN 
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
    LOOP 
        -- Check if table has sequencial_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'sequencial_id') THEN
            -- Check for a timestamp column to order by
            SELECT column_name INTO c 
            FROM information_schema.columns 
            WHERE table_name = t 
              AND (column_name = 'created_at' OR column_name = 'gerado_em')
            LIMIT 1;

            IF c IS NOT NULL THEN
                -- Temporarily drop the identity to re-assign
                EXECUTE format('ALTER TABLE public.%I ALTER COLUMN sequencial_id DROP IDENTITY IF EXISTS', t);
                
                -- Update with row number
                EXECUTE format('
                    WITH ordered AS (
                        SELECT id, row_number() OVER (ORDER BY %I ASC) as new_seq
                        FROM public.%I
                    )
                    UPDATE public.%I t_inner
                    SET sequencial_id = o.new_seq
                    FROM ordered o
                    WHERE t_inner.id = o.id', c, t, t);
                
                -- Re-add identity starting from the next value
                EXECUTE format('SELECT COALESCE(MAX(sequencial_id), 0) FROM public.%I', t) INTO max_val;
                
                EXECUTE format('ALTER TABLE public.%I ALTER COLUMN sequencial_id ADD GENERATED ALWAYS AS IDENTITY (START WITH %s)', t, max_val + 1);
            END IF;
        END IF;
    END LOOP; 
END $$;
