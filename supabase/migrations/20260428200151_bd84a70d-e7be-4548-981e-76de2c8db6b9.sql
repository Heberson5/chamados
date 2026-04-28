-- Revoke broad execute permissions from PUBLIC for all functions in the public schema
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Grant execute permissions only to authenticated users and the service role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Refine storage policies to prevent broad object listing while maintaining access
-- For chamados_anexos
DROP POLICY IF EXISTS "Chamados Anexos Public Access" ON storage.objects;
CREATE POLICY "Chamados Anexos Access" ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chamados_anexos' AND (auth.role() = 'authenticated'));

-- For ticket-attachments
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Ticket Attachments Access" ON storage.objects 
FOR SELECT 
USING (bucket_id = 'ticket-attachments' AND (auth.role() = 'authenticated'));
