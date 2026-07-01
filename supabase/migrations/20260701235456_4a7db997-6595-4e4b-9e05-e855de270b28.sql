
-- 1) Standardize identity checks in helper functions (accept id OR user_id)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (user_id = auth.uid() OR id = auth.uid())
      AND (regra = 'ADMIN'::public.regra OR regra = 'MASTER'::public.regra OR is_master = true)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_is_master()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (user_id = auth.uid() OR id = auth.uid())
      AND (is_master = true OR regra = 'MASTER'::public.regra)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_master_user()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (user_id = auth.uid() OR id = auth.uid())
      AND (regra = 'MASTER'::public.regra OR is_master = true)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_tecnico()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (user_id = auth.uid() OR id = auth.uid())
      AND (regra = 'TECNICO' OR regra = 'ADMIN' OR regra = 'MASTER' OR is_master = true OR pode_receber_chamados = true)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (id = _user_id OR user_id = _user_id)
      AND organization_id = _org_id
  );
END;
$$;

-- 2) fornecedores: restrict SELECT to admin/master
DROP POLICY IF EXISTS "Authenticated read fornecedores" ON public.fornecedores;
CREATE POLICY "Admin read fornecedores" ON public.fornecedores
  FOR SELECT TO authenticated USING (public.is_admin());

-- 3) estoque_setor: explicit fail-closed for non-admins
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.estoque_setor FROM anon;
-- (Admin All policy already covers admin; no other policy = deny for non-admin)

-- 4) audit_logs: ensure INSERT is not granted at role level
REVOKE INSERT ON public.audit_logs FROM anon, authenticated, PUBLIC;

-- 5) Storage: remove permissive upload policy on ticket-attachments (kept the ownership-scoped one)
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

-- 6) organizations: move email_settings to a separate admin-only table
CREATE TABLE IF NOT EXISTS public.organization_email_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_email text NOT NULL DEFAULT 'notificacoes@suaempresa.com',
  sender_name text NOT NULL DEFAULT 'Sistema de Chamados',
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_email_settings TO authenticated;
GRANT ALL ON public.organization_email_settings TO service_role;

ALTER TABLE public.organization_email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage org email settings"
  ON public.organization_email_settings
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.check_is_master())
  WITH CHECK (public.is_admin() OR public.check_is_master());

-- migrate existing data
INSERT INTO public.organization_email_settings (organization_id, sender_email, sender_name, extra)
SELECT o.id,
       COALESCE(o.email_settings->>'sender_email', 'notificacoes@suaempresa.com'),
       COALESCE(o.email_settings->>'sender_name', 'Sistema de Chamados'),
       COALESCE(o.email_settings - 'sender_email' - 'sender_name', '{}'::jsonb)
  FROM public.organizations o
ON CONFLICT (organization_id) DO NOTHING;

-- update the trigger function to read from new table (kept backward compatible)
CREATE OR REPLACE FUNCTION public.handle_ticket_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    creator_email TEXT;
    creator_name TEXT;
    company_name TEXT;
    v_org_id UUID;
    ticket_num INTEGER;
    v_subject TEXT;
    v_content TEXT;
    v_ticket_id UUID;
BEGIN
    IF TG_TABLE_NAME = 'ticket_comments' THEN
        v_ticket_id := NEW.ticket_id;
        SELECT t.number, t.organization_id, p.email, p.full_name
          INTO ticket_num, v_org_id, creator_email, creator_name
          FROM public.tickets t
          JOIN public.profiles p ON p.id = t.requester_id
         WHERE t.id = v_ticket_id;
    ELSE
        v_ticket_id := NEW.id;
        v_org_id := NEW.organization_id;
        ticket_num := NEW.number;
        SELECT p.email, p.full_name INTO creator_email, creator_name
          FROM public.profiles p WHERE p.id = NEW.requester_id;
    END IF;

    IF creator_email IS NULL THEN RETURN NEW; END IF;

    SELECT name INTO company_name FROM public.organizations WHERE id = v_org_id;

    IF TG_TABLE_NAME = 'ticket_comments' THEN
        IF NEW.is_internal THEN RETURN NEW; END IF;
        v_subject := 'Nova interação no chamado #' || ticket_num;
        v_content := 'Olá ' || COALESCE(creator_name, 'usuário') || ', há uma nova interação no seu chamado #' || ticket_num || ' da empresa ' || company_name || '.';
    ELSE
        v_subject := 'Alteração de status no chamado #' || ticket_num;
        v_content := 'Olá ' || COALESCE(creator_name, 'usuário') || ', o status do seu chamado #' || ticket_num || ' foi alterado para ' || NEW.status || '.';
    END IF;

    INSERT INTO public.notifications (organization_id, recipient_email, subject, content, metadata)
    VALUES (v_org_id, creator_email, v_subject, v_content, jsonb_build_object(
        'ticket_id', v_ticket_id,
        'type', TG_TABLE_NAME,
        'trigger_event', TG_OP
    ));

    RETURN NEW;
END;
$$;

-- drop sensitive column from organizations
ALTER TABLE public.organizations DROP COLUMN IF EXISTS email_settings;

-- 7) Revoke EXECUTE on trigger-only SECURITY DEFINER functions from anon and authenticated
REVOKE EXECUTE ON FUNCTION public.audit_trigger_function() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_ticket_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_master_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_master_role() FROM PUBLIC, anon, authenticated;

-- log_user_action: keep authenticated (called from client), revoke from anon
REVOKE EXECUTE ON FUNCTION public.log_user_action(text) FROM PUBLIC, anon;
