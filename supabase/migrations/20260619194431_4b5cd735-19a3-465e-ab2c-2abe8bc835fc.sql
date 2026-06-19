
-- Access schedule columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS access_schedule jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_logout_at timestamptz;
ALTER TABLE public.departamentos ADD COLUMN IF NOT EXISTS access_schedule jsonb;

-- Protect Master role
CREATE OR REPLACE FUNCTION public.protect_master_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF lower(OLD.name) = 'master' THEN
      RAISE EXCEPTION 'O perfil Master não pode ser excluído.';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF lower(OLD.name) = 'master' THEN
      -- enforce 'permissoes' stays in permissions
      IF NOT (NEW.permissions ? 'permissoes') THEN
        NEW.permissions = NEW.permissions || '["permissoes"]'::jsonb;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_master_role ON public.role_definitions;
CREATE TRIGGER trg_protect_master_role
BEFORE UPDATE OR DELETE ON public.role_definitions
FOR EACH ROW EXECUTE FUNCTION public.protect_master_role();

-- Seed access warning settings
INSERT INTO public.system_settings (key, value)
VALUES ('access_warnings', '{"pre_minutes":30,"final_minutes":5,"browser_notify":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;
