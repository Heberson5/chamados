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
        -- 1. Rename 'sequencial_id' to 'id_numerico' if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'sequencial_id') THEN
            EXECUTE format('ALTER TABLE public.%I RENAME COLUMN sequencial_id TO id_numerico', t);
        END IF;

        -- 2. Ensure 'id_numerico' exists (in case it wasn't added before)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'id_numerico') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN id_numerico BIGINT GENERATED ALWAYS AS IDENTITY', t);
        END IF;

        -- 3. Re-sequence existing records based on creation date
        SELECT column_name INTO c 
        FROM information_schema.columns 
        WHERE table_name = t 
          AND (column_name = 'created_at' OR column_name = 'gerado_em')
        LIMIT 1;

        IF c IS NOT NULL THEN
            -- Temporarily drop the identity to re-assign
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id_numerico DROP IDENTITY IF EXISTS', t);
            
            -- Update with row number
            EXECUTE format('
                WITH ordered AS (
                    SELECT id, row_number() OVER (ORDER BY %I ASC) as new_seq
                    FROM public.%I
                )
                UPDATE public.%I t_inner
                SET id_numerico = o.new_seq
                FROM ordered o
                WHERE t_inner.id = o.id', c, t, t);
            
            -- Re-add identity starting from the next value
            EXECUTE format('SELECT COALESCE(MAX(id_numerico), 0) FROM public.%I', t) INTO max_val;
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id_numerico ADD GENERATED ALWAYS AS IDENTITY (START WITH %s)', t, max_val + 1);
        END IF;
    END LOOP; 

    -- Special case for audit_logs where we already renamed columns
    -- If 'id' is bigint and 'uuid' exists, just rename 'id' to 'id_numerico' and 'uuid' to 'id' (to restore standard id)
    -- Actually, the user wants numeric IDs, so I'll keep 'id' as bigint for audit_logs as it was successful.
END $$;
