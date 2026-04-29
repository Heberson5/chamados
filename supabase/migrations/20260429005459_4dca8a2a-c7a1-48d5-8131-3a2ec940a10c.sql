DO $$ 
DECLARE 
    t TEXT;
BEGIN 
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
    LOOP 
        BEGIN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS sequencial_id BIGINT GENERATED ALWAYS AS IDENTITY', t);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not add sequencial_id to table %: %', t, SQLERRM;
        END;
    END LOOP; 
END $$;
