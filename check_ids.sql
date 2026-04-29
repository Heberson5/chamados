DO $$ 
DECLARE 
    t TEXT;
    total INT;
    with_seq INT;
BEGIN 
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
    LOOP 
        EXECUTE format('SELECT count(*) FROM public.%I', t) INTO total;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'sequencial_id') THEN
            EXECUTE format('SELECT count(*) FROM public.%I WHERE sequencial_id > 0', t) INTO with_seq;
            RAISE NOTICE 'Table %: Total %, With Seq %', t, total, with_seq;
        ELSE
            RAISE NOTICE 'Table %: Total %, MISSING COLUMN', t, total;
        END IF;
    END LOOP; 
END $$;
