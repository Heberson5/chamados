
-- 1) categorias & itens_inventario: require auth for SELECT
DROP POLICY IF EXISTS "Public Read" ON public.categorias;
CREATE POLICY "Authenticated Read" ON public.categorias FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public Read" ON public.itens_inventario;
CREATE POLICY "Authenticated Read" ON public.itens_inventario FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.categorias FROM anon;
REVOKE SELECT ON public.itens_inventario FROM anon;

-- 2) password_history: drop user-facing SELECT policy (hashes only accessed via SECURITY DEFINER RPCs)
DROP POLICY IF EXISTS "Users can view their own password history" ON public.password_history;
REVOKE SELECT ON public.password_history FROM authenticated, anon;

-- 3) audit_logs: only server (trigger/definer) may insert
DROP POLICY IF EXISTS "Allow system to insert logs" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM anon, authenticated;
-- log_user_action is SECURITY DEFINER and bypasses RLS/grants via service role owner

-- 4) Fix function search_path
ALTER FUNCTION public.check_password_history(uuid, text) SET search_path = public;
ALTER FUNCTION public.store_password_history(uuid, text) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 5) Revoke public EXECUTE on sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.check_password_history(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.store_password_history(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_session_user_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_user_action(text) FROM PUBLIC, anon;

-- Revoke from anon on all SECURITY DEFINER RLS helpers (authenticated still needs them for RLS eval)
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_tecnico() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_master_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_is_master() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_organization_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_org(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_member_of_same_org(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, uuid, public.app_role) FROM anon;

-- 6) Ticket attachment access: only ticket participants (requester/technician/admin)
CREATE OR REPLACE FUNCTION public.can_access_chamado(_chamado_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chamados c
    WHERE c.id = _chamado_id
      AND (
        c.usuario_id = auth.uid()
        OR c.tecnico_id = auth.uid()
        OR public.is_admin()
        OR (
          c.department_id IS NOT NULL AND c.department_id IN (
            SELECT p.department_id FROM public.profiles p
            WHERE (p.user_id = auth.uid() OR p.id = auth.uid())
              AND p.department_id IS NOT NULL
          )
        )
        OR (
          c.department_id IS NOT NULL AND c.department_id IN (
            SELECT unnest(p.admin_departments) FROM public.profiles p
            WHERE (p.user_id = auth.uid() OR p.id = auth.uid())
          )
        )
      )
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_chamado(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_chamado(uuid) TO authenticated;

-- Replace storage.objects policies for both buckets
DROP POLICY IF EXISTS "Ticket Attachments Access" ON storage.objects;
DROP POLICY IF EXISTS "Chamados Anexos Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chamados attachments" ON storage.objects;

CREATE POLICY "Ticket participants read attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('ticket-attachments','chamados_anexos')
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.can_access_chamado(((storage.foldername(name))[1])::uuid)
    )
  )
);

CREATE POLICY "Ticket participants upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('ticket-attachments','chamados_anexos')
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.can_access_chamado(((storage.foldername(name))[1])::uuid)
);
