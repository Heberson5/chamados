DO $$ 
BEGIN 
    -- Audit Logs: Swap ID and Sequencial ID
    -- First, check if 'uuid' already exists (in case of partial success)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'id' AND data_type = 'uuid') THEN
        ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey CASCADE;
        ALTER TABLE public.audit_logs RENAME COLUMN id TO uuid;
        ALTER TABLE public.audit_logs RENAME COLUMN sequencial_id TO id;
        ALTER TABLE public.audit_logs ADD PRIMARY KEY (id);
    END IF;
END $$;
