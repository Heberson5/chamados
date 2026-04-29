-- Add foreign key to audit_logs if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'audit_logs_user_id_fkey'
    ) THEN
        ALTER TABLE public.audit_logs
        ADD CONSTRAINT audit_logs_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Update RLS for audit_logs
DROP POLICY IF EXISTS "Only masters can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users with audit permission can view logs" ON public.audit_logs;

CREATE POLICY "Users with audit permission can view logs" 
ON public.audit_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.is_master = true 
            OR profiles.regra::text IN (
                SELECT name FROM role_definitions 
                WHERE permissions @> '["audit"]'
            )
        )
    )
);

-- Allow system to insert logs
DROP POLICY IF EXISTS "Allow system to insert logs" ON public.audit_logs;
CREATE POLICY "Allow system to insert logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
