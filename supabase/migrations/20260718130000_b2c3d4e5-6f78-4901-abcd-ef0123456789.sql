-- Conecta chamados.status_id como fonte da verdade do status do chamado,
-- permitindo colunas de Kanban ilimitadas (chamado_statuses deixa de
-- depender do enum fixo chamado_status para funcionar como coluna real).
--
-- chamados.status (enum) é mantido e sincronizado automaticamente a partir
-- de status_id, como uma "sombra" de compatibilidade para qualquer código
-- ou policy que ainda dependa dele.

ALTER TABLE public.chamado_statuses
  ALTER COLUMN legacy_enum DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_legacy_status_from_status_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target public.chamado_statuses%ROWTYPE;
BEGIN
  -- Se nenhum status_id foi informado (ex: criação de chamado sem passar
  -- status_id explicitamente), usa o status inicial configurado.
  IF NEW.status_id IS NULL THEN
    SELECT * INTO target FROM public.chamado_statuses
     WHERE is_inicial = true AND ativo = true
     LIMIT 1;
    IF FOUND THEN
      NEW.status_id := target.id;
    END IF;
  ELSE
    SELECT * INTO target FROM public.chamado_statuses WHERE id = NEW.status_id;
  END IF;

  IF FOUND THEN
    NEW.status := COALESCE(
      target.legacy_enum::public.chamado_status,
      CASE
        WHEN target.is_encerrado THEN 'ENCERRADO'
        WHEN target.is_cancelado THEN 'CANCELADO'
        WHEN target.is_pausa THEN 'PAUSADO'
        WHEN target.is_inicial THEN 'ABERTO'
        ELSE 'EM_ATENDIMENTO'
      END::public.chamado_status
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_legacy_status_trg ON public.chamados;
CREATE TRIGGER sync_legacy_status_trg
BEFORE INSERT OR UPDATE OF status_id ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_status_from_status_id();

-- Backfill: preenche status_id em qualquer chamado que ainda não tenha
-- (inclui os criados depois da migração 20260711001606, já que nada
-- escrevia em status_id até agora).
UPDATE public.chamados c
   SET status_id = s.id
  FROM public.chamado_statuses s
 WHERE c.status_id IS NULL
   AND s.legacy_enum = c.status::text
   AND s.ativo = true;
