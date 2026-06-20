
CREATE OR REPLACE FUNCTION public.protect_master_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_is_master boolean;
BEGIN
  old_is_master := COALESCE(OLD.is_master, OLD.regra = 'MASTER'::public.regra);

  IF TG_OP = 'DELETE' THEN
    IF old_is_master THEN
      RAISE EXCEPTION 'O usuário Master não pode ser excluído.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND old_is_master THEN
    -- Block deactivation
    IF NEW.ativo IS DISTINCT FROM OLD.ativo AND NEW.ativo = false THEN
      RAISE EXCEPTION 'O usuário Master não pode ser desativado.';
    END IF;
    -- Block soft delete
    IF NEW.deletado_em IS NOT NULL AND OLD.deletado_em IS NULL THEN
      RAISE EXCEPTION 'O usuário Master não pode ser excluído.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_master_profile_trg ON public.profiles;
CREATE TRIGGER protect_master_profile_trg
BEFORE UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_master_profile();
