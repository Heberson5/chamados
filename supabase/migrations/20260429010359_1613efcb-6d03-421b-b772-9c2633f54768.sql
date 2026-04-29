DROP POLICY IF EXISTS "Users with audit permission can view logs" ON public.audit_logs;

CREATE POLICY "Users with audit permission can view logs" 
ON public.audit_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND (
            p.is_master = true 
            OR UPPER(p.regra::text) IN (
                SELECT UPPER(name) FROM role_definitions 
                WHERE permissions @> '["audit"]'
            )
        )
    )
);
