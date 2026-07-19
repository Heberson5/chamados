-- SLA: horas configuráveis por prioridade + preenchimento automático de
-- sla_deadline (na abertura e ao trocar a prioridade) e sla_violado (quando
-- o chamado passa do prazo, seja ao ser encerrado ou em qualquer atualização
-- enquanto ainda está aberto).

ALTER TABLE public.chamados_prioridades
  ADD COLUMN IF NOT EXISTS sla_horas INTEGER NOT NULL DEFAULT 24;

CREATE OR REPLACE FUNCTION public.compute_sla_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  horas INTEGER;
BEGIN
  -- (Re)calcula o prazo quando ainda não existe (chamado novo) ou quando a
  -- prioridade foi alterada.
  IF NEW.prioridade_id IS NOT NULL AND (
       TG_OP = 'INSERT'
       OR NEW.prioridade_id IS DISTINCT FROM OLD.prioridade_id
     ) THEN
    SELECT sla_horas INTO horas
      FROM public.chamados_prioridades
     WHERE id = NEW.prioridade_id;

    IF horas IS NOT NULL THEN
      NEW.sla_deadline := COALESCE(NEW.gerado_em, now()) + (horas || ' hours')::interval;
    END IF;
  END IF;

  -- Marca violação de SLA (uma vez só) quando o prazo já passou, seja porque
  -- o chamado foi encerrado depois do prazo ou porque ainda está em aberto e
  -- o prazo já venceu.
  IF NEW.sla_deadline IS NOT NULL
     AND NOT COALESCE(NEW.sla_violado, false)
     AND COALESCE(NEW.encerrado_em, now()) > NEW.sla_deadline THEN
    NEW.sla_violado := true;
    NEW.sla_violado_em := COALESCE(NEW.encerrado_em, now());
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS compute_sla_fields_trg ON public.chamados;
CREATE TRIGGER compute_sla_fields_trg
BEFORE INSERT OR UPDATE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.compute_sla_fields();

-- Preenche retroativamente os chamados existentes que ainda não têm prazo.
UPDATE public.chamados c
   SET sla_deadline = COALESCE(c.gerado_em, now()) + (p.sla_horas || ' hours')::interval
  FROM public.chamados_prioridades p
 WHERE c.prioridade_id = p.id
   AND c.sla_deadline IS NULL;
