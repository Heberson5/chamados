-- =====================================================================
-- Recursos de chamados
--
--  1. Notificações: política de INSERT (antes não havia — os avisos de
--     nova interação/transferência falhavam em silêncio) + helper interno
--  2. Nota interna (comentário visível só para a equipe técnica)
--  3. Histórico de eventos do chamado (quem mudou o quê e quando)
--  4. Favoritos
--  5. Avaliação do atendimento (CSAT, 1 a 5)
--  6. Categorias de serviço (SLA, prioridade, responsável e campos próprios)
--  7. Automações: atribuição automática, aviso de SLA vencido e
--     encerramento de chamados parados aguardando o usuário
--  8. Respostas prontas
--  9. Inscrições de notificação push (PWA)
--
-- Idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Notificações
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Participantes notificam participantes" ON public.notificacoes;
CREATE POLICY "Participantes notificam participantes" ON public.notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_tecnico()
    OR usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chamados c
       WHERE (c.usuario_id = notificacoes.usuario_id OR c.tecnico_id = notificacoes.usuario_id)
         AND (c.usuario_id = auth.uid() OR c.tecnico_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.notificar(_usuario uuid, _titulo text, _mensagem text, _link text DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
  SELECT _usuario, _titulo, _mensagem, _link
   WHERE _usuario IS NOT NULL;
$$;
REVOKE EXECUTE ON FUNCTION public.notificar(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Nota interna
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Nota interna so para equipe" ON public.comentarios_chamado;
CREATE POLICY "Nota interna so para equipe" ON public.comentarios_chamado
  AS RESTRICTIVE
  FOR ALL
  USING (NOT COALESCE(visibilidade_interna, false) OR public.is_tecnico())
  WITH CHECK (NOT COALESCE(visibilidade_interna, false) OR public.is_tecnico());

-- ---------------------------------------------------------------------
-- 6. Categorias de serviço (antes do histórico, que referencia categoria)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chamado_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  cor text NOT NULL DEFAULT '#5643f0',
  sla_horas integer CHECK (sla_horas IS NULL OR sla_horas > 0),
  prioridade_padrao_id uuid REFERENCES public.chamados_prioridades(id) ON DELETE SET NULL,
  tecnico_padrao_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  campos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chamado_categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Categorias visiveis a todos" ON public.chamado_categorias;
CREATE POLICY "Categorias visiveis a todos" ON public.chamado_categorias
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin gerencia categorias" ON public.chamado_categorias;
CREATE POLICY "Admin gerencia categorias" ON public.chamado_categorias
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP TRIGGER IF EXISTS chamado_categorias_touch ON public.chamado_categorias;
CREATE TRIGGER chamado_categorias_touch BEFORE UPDATE ON public.chamado_categorias
  FOR EACH ROW EXECUTE FUNCTION public.lgpd_touch_atualizado_em();

ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES public.chamado_categorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campos_extras jsonb,
  ADD COLUMN IF NOT EXISTS sla_escalado_em timestamptz;
CREATE INDEX IF NOT EXISTS chamados_categoria_idx ON public.chamados (categoria_id);

-- SLA da categoria tem precedência sobre o da prioridade.
CREATE OR REPLACE FUNCTION public.compute_sla_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  horas INTEGER;
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.prioridade_id IS DISTINCT FROM OLD.prioridade_id
     OR NEW.categoria_id IS DISTINCT FROM OLD.categoria_id THEN
    horas := NULL;
    IF NEW.categoria_id IS NOT NULL THEN
      SELECT sla_horas INTO horas FROM public.chamado_categorias WHERE id = NEW.categoria_id;
    END IF;
    IF horas IS NULL AND NEW.prioridade_id IS NOT NULL THEN
      SELECT sla_horas INTO horas FROM public.chamados_prioridades WHERE id = NEW.prioridade_id;
    END IF;
    IF horas IS NOT NULL THEN
      NEW.sla_deadline := COALESCE(NEW.gerado_em, now()) + (horas || ' hours')::interval;
    END IF;
  END IF;

  IF NEW.sla_deadline IS NOT NULL
     AND NOT COALESCE(NEW.sla_violado, false)
     AND COALESCE(NEW.encerrado_em, now()) > NEW.sla_deadline THEN
    NEW.sla_violado := true;
    NEW.sla_violado_em := COALESCE(NEW.encerrado_em, now());
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------
-- 7a. Atribuição automática (roda antes dos demais gatilhos: nome "a_...")
-- ---------------------------------------------------------------------
INSERT INTO public.system_settings (key, value)
VALUES (
  'automacoes',
  jsonb_build_object(
    'auto_atribuir', false,
    'avisar_sla_vencido', true,
    'fechar_aguardando_dias', 0
  )
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.chamados_auto_atribuir()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cat public.chamado_categorias%ROWTYPE;
  cfg jsonb;
  escolhido uuid;
BEGIN
  IF NEW.categoria_id IS NOT NULL THEN
    SELECT * INTO cat FROM public.chamado_categorias WHERE id = NEW.categoria_id;
    IF FOUND THEN
      IF NEW.prioridade_id IS NULL THEN
        NEW.prioridade_id := cat.prioridade_padrao_id;
      END IF;
      IF NEW.tecnico_id IS NULL AND cat.tecnico_padrao_id IS NOT NULL THEN
        NEW.tecnico_id := cat.tecnico_padrao_id;
      END IF;
    END IF;
  END IF;

  IF NEW.tecnico_id IS NULL THEN
    SELECT value INTO cfg FROM public.system_settings WHERE key = 'automacoes';
    IF COALESCE((cfg ->> 'auto_atribuir')::boolean, false) THEN
      -- Menor carga de chamados em aberto; prefere quem é do mesmo
      -- departamento do chamado; desempate por quem recebeu há mais tempo.
      SELECT p.id INTO escolhido
        FROM public.profiles p
        LEFT JOIN LATERAL (
          SELECT count(*) AS abertos, max(c.gerado_em) AS ultimo
            FROM public.chamados c
            LEFT JOIN public.chamado_statuses s ON s.id = c.status_id
           WHERE c.tecnico_id = p.id
             AND c.deletado_em IS NULL
             AND NOT COALESCE(s.is_encerrado, c.status = 'ENCERRADO')
             AND NOT COALESCE(s.is_cancelado, c.status = 'CANCELADO')
        ) carga ON true
       WHERE COALESCE(p.ativo, true)
         AND p.deletado_em IS NULL
         AND (p.pode_receber_chamados = true OR p.regra = 'TECNICO')
       ORDER BY (p.department_id IS NOT DISTINCT FROM NEW.department_id) DESC,
                carga.abertos ASC,
                carga.ultimo ASC NULLS FIRST
       LIMIT 1;
      NEW.tecnico_id := escolhido;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a_chamados_auto_atribuir_trg ON public.chamados;
CREATE TRIGGER a_chamados_auto_atribuir_trg
  BEFORE INSERT ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.chamados_auto_atribuir();

-- ---------------------------------------------------------------------
-- 3. Histórico de eventos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chamado_eventos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chamado_id uuid NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  ator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  de text,
  para text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chamado_eventos_chamado_idx ON public.chamado_eventos (chamado_id, criado_em);
ALTER TABLE public.chamado_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Eventos visiveis a quem ve o chamado" ON public.chamado_eventos;
CREATE POLICY "Eventos visiveis a quem ve o chamado" ON public.chamado_eventos
  FOR SELECT TO authenticated USING (public.can_access_chamado(chamado_id));

CREATE OR REPLACE FUNCTION public._nome_perfil(_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NULLIF(trim(COALESCE(nome, '') || ' ' || COALESCE(sobrenome, '')), '') FROM public.profiles WHERE id = _id;
$$;

CREATE OR REPLACE FUNCTION public.chamados_registrar_eventos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ator uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.chamado_eventos (chamado_id, ator_id, tipo, para)
    VALUES (NEW.id, COALESCE(ator, NEW.usuario_id), 'criado', NULL);
    IF NEW.tecnico_id IS NOT NULL AND NEW.tecnico_id IS DISTINCT FROM ator THEN
      INSERT INTO public.chamado_eventos (chamado_id, ator_id, tipo, para)
      VALUES (NEW.id, ator, 'responsavel', public._nome_perfil(NEW.tecnico_id));
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status_id IS DISTINCT FROM OLD.status_id THEN
    INSERT INTO public.chamado_eventos (chamado_id, ator_id, tipo, de, para)
    VALUES (NEW.id, ator, 'status',
            (SELECT label FROM public.chamado_statuses WHERE id = OLD.status_id),
            (SELECT label FROM public.chamado_statuses WHERE id = NEW.status_id));
  END IF;
  IF NEW.tecnico_id IS DISTINCT FROM OLD.tecnico_id THEN
    INSERT INTO public.chamado_eventos (chamado_id, ator_id, tipo, de, para)
    VALUES (NEW.id, ator, 'responsavel', public._nome_perfil(OLD.tecnico_id), public._nome_perfil(NEW.tecnico_id));
  END IF;
  IF NEW.prioridade_id IS DISTINCT FROM OLD.prioridade_id THEN
    INSERT INTO public.chamado_eventos (chamado_id, ator_id, tipo, de, para)
    VALUES (NEW.id, ator, 'prioridade',
            (SELECT nome FROM public.chamados_prioridades WHERE id = OLD.prioridade_id),
            (SELECT nome FROM public.chamados_prioridades WHERE id = NEW.prioridade_id));
  END IF;
  IF NEW.categoria_id IS DISTINCT FROM OLD.categoria_id THEN
    INSERT INTO public.chamado_eventos (chamado_id, ator_id, tipo, de, para)
    VALUES (NEW.id, ator, 'categoria',
            (SELECT nome FROM public.chamado_categorias WHERE id = OLD.categoria_id),
            (SELECT nome FROM public.chamado_categorias WHERE id = NEW.categoria_id));
  END IF;
  IF NEW.contem_dado_sensivel IS DISTINCT FROM OLD.contem_dado_sensivel THEN
    INSERT INTO public.chamado_eventos (chamado_id, ator_id, tipo, para)
    VALUES (NEW.id, ator, 'sensivel', CASE WHEN NEW.contem_dado_sensivel THEN 'sim' ELSE 'não' END);
  END IF;
  IF NEW.sla_escalado_em IS NOT NULL AND OLD.sla_escalado_em IS NULL THEN
    INSERT INTO public.chamado_eventos (chamado_id, ator_id, tipo)
    VALUES (NEW.id, NULL, 'sla_vencido');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chamados_eventos_trg ON public.chamados;
CREATE TRIGGER chamados_eventos_trg
  AFTER INSERT OR UPDATE ON public.chamados
  FOR EACH ROW EXECUTE FUNCTION public.chamados_registrar_eventos();

-- ---------------------------------------------------------------------
-- 4. Favoritos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chamado_favoritos (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  chamado_id uuid NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chamado_id)
);
ALTER TABLE public.chamado_favoritos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Favoritos do proprio usuario" ON public.chamado_favoritos;
CREATE POLICY "Favoritos do proprio usuario" ON public.chamado_favoritos
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.can_access_chamado(chamado_id));

-- ---------------------------------------------------------------------
-- 5. Avaliação do atendimento
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chamado_avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL UNIQUE REFERENCES public.chamados(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  tecnico_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  nota smallint NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chamado_avaliacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Solicitante avalia chamado encerrado" ON public.chamado_avaliacoes;
CREATE POLICY "Solicitante avalia chamado encerrado" ON public.chamado_avaliacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chamados c
        LEFT JOIN public.chamado_statuses s ON s.id = c.status_id
       WHERE c.id = chamado_avaliacoes.chamado_id
         AND c.usuario_id = auth.uid()
         AND (COALESCE(s.is_encerrado, false) OR c.status = 'ENCERRADO')
         AND chamado_avaliacoes.tecnico_id IS NOT DISTINCT FROM c.tecnico_id
    )
  );
DROP POLICY IF EXISTS "Avaliacoes visiveis" ON public.chamado_avaliacoes;
CREATE POLICY "Avaliacoes visiveis" ON public.chamado_avaliacoes
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR tecnico_id = auth.uid() OR public.is_admin() OR public.can_access_chamado(chamado_id));

-- ---------------------------------------------------------------------
-- 7b. Aviso de SLA vencido e encerramento automático
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chamados_rotina_automacoes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg jsonb;
  dias integer;
  st_encerrado uuid;
  r record;
  n_sla integer := 0;
  n_fechados integer := 0;
BEGIN
  IF NOT (
    public.is_admin()
    OR auth.role() = 'service_role'
    OR (auth.uid() IS NULL AND COALESCE(auth.role(), '') NOT IN ('anon', 'authenticated'))
  ) THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  SELECT value INTO cfg FROM public.system_settings WHERE key = 'automacoes';
  cfg := COALESCE(cfg, '{}'::jsonb);

  -- SLA vencido: avisa responsável e administradores uma única vez.
  IF COALESCE((cfg ->> 'avisar_sla_vencido')::boolean, true) THEN
    FOR r IN
      SELECT c.id, c.os, c.titulo, c.tecnico_id
        FROM public.chamados c
        LEFT JOIN public.chamado_statuses s ON s.id = c.status_id
       WHERE c.deletado_em IS NULL
         AND c.sla_deadline IS NOT NULL
         AND c.sla_deadline < now()
         AND c.sla_escalado_em IS NULL
         AND c.encerrado_em IS NULL
         AND NOT COALESCE(s.is_encerrado, false)
         AND NOT COALESCE(s.is_cancelado, false)
         AND NOT COALESCE(s.is_pausa, false)
    LOOP
      UPDATE public.chamados SET sla_escalado_em = now(), sla_violado = true,
             sla_violado_em = COALESCE(sla_violado_em, now())
       WHERE id = r.id;
      PERFORM public.notificar(r.tecnico_id, 'SLA vencido: #' || r.os,
                               COALESCE(r.titulo, 'Chamado') || ' passou do prazo de atendimento.', '/chamados?id=' || r.id);
      PERFORM public.notificar(p.id, 'SLA vencido: #' || r.os,
                               COALESCE(r.titulo, 'Chamado') || ' passou do prazo de atendimento.', '/chamados?id=' || r.id)
         FROM public.profiles p
        WHERE (p.regra IN ('ADMIN', 'MASTER') OR p.is_master)
          AND COALESCE(p.ativo, true)
          AND p.id IS DISTINCT FROM r.tecnico_id;
      n_sla := n_sla + 1;
    END LOOP;
  END IF;

  -- Aguardando o usuário há mais de N dias: encerra automaticamente.
  dias := NULLIF(cfg ->> 'fechar_aguardando_dias', '')::integer;
  IF dias IS NOT NULL AND dias > 0 THEN
    SELECT id INTO st_encerrado FROM public.chamado_statuses
     WHERE is_encerrado AND ativo ORDER BY ordem LIMIT 1;
    IF st_encerrado IS NOT NULL THEN
      FOR r IN
        SELECT c.id, c.os, c.titulo, c.usuario_id, c.aguardando_usuario_em
          FROM public.chamados c
         WHERE c.deletado_em IS NULL
           AND c.status = 'AGUARDANDO_USUARIO'
           AND c.aguardando_usuario_em IS NOT NULL
           AND c.aguardando_usuario_em < now() - make_interval(days => dias)
      LOOP
        UPDATE public.chamados
           SET status_id = st_encerrado,
               encerrado_em = now(),
               tempo_total_aguardando_usuario = COALESCE(tempo_total_aguardando_usuario, 0)
                 + GREATEST(0, EXTRACT(EPOCH FROM (now() - r.aguardando_usuario_em))::integer),
               aguardando_usuario_em = NULL,
               descricao_encerramento = 'Encerrado automaticamente: sem retorno do solicitante há mais de ' || dias || ' dia(s).'
         WHERE id = r.id;
        INSERT INTO public.chamado_eventos (chamado_id, ator_id, tipo, para)
        VALUES (r.id, NULL, 'auto_encerrado', dias || ' dia(s) sem retorno');
        PERFORM public.notificar(r.usuario_id, 'Chamado #' || r.os || ' encerrado',
                                 'Encerrado automaticamente por falta de retorno. Se ainda precisar de ajuda, abra um novo chamado ou peça a reabertura.',
                                 '/chamados?id=' || r.id);
        n_fechados := n_fechados + 1;
      END LOOP;
    END IF;
  END IF;

  RETURN jsonb_build_object('sla_avisados', n_sla, 'encerrados_automaticamente', n_fechados);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.chamados_rotina_automacoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chamados_rotina_automacoes() TO authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'chamados-automacoes';
    PERFORM cron.schedule('chamados-automacoes', '*/10 * * * *', 'select public.chamados_rotina_automacoes()');
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'pg_cron indisponível (%). Agende a rotina pela função de borda "automacoes".', SQLERRM;
END $$;

-- ---------------------------------------------------------------------
-- 8. Respostas prontas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.respostas_prontas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  atalho text,
  conteudo text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.respostas_prontas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Equipe le respostas prontas" ON public.respostas_prontas;
CREATE POLICY "Equipe le respostas prontas" ON public.respostas_prontas
  FOR SELECT TO authenticated USING (public.is_tecnico());
DROP POLICY IF EXISTS "Equipe cria respostas prontas" ON public.respostas_prontas;
CREATE POLICY "Equipe cria respostas prontas" ON public.respostas_prontas
  FOR INSERT TO authenticated WITH CHECK (public.is_tecnico() AND criado_por = auth.uid());
DROP POLICY IF EXISTS "Autor ou admin altera respostas prontas" ON public.respostas_prontas;
CREATE POLICY "Autor ou admin altera respostas prontas" ON public.respostas_prontas
  FOR UPDATE TO authenticated USING (criado_por = auth.uid() OR public.is_admin()) WITH CHECK (criado_por = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Autor ou admin remove respostas prontas" ON public.respostas_prontas;
CREATE POLICY "Autor ou admin remove respostas prontas" ON public.respostas_prontas
  FOR DELETE TO authenticated USING (criado_por = auth.uid() OR public.is_admin());
DROP TRIGGER IF EXISTS respostas_prontas_touch ON public.respostas_prontas;
CREATE TRIGGER respostas_prontas_touch BEFORE UPDATE ON public.respostas_prontas
  FOR EACH ROW EXECUTE FUNCTION public.lgpd_touch_atualizado_em();

-- ---------------------------------------------------------------------
-- 9. Push (PWA)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inscricoes do proprio usuario" ON public.push_subscriptions;
CREATE POLICY "Inscricoes do proprio usuario" ON public.push_subscriptions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Relatório agendado por e-mail (configuração; o envio é feito pela função
-- de borda "relatorio-agendado").
INSERT INTO public.system_settings (key, value)
VALUES ('relatorios_agendados', jsonb_build_object('ativo', false, 'frequencia', 'semanal', 'destinatarios', '[]'::jsonb, 'ultimo_envio', NULL))
ON CONFLICT (key) DO NOTHING;

-- Realtime para as novas tabelas que a tela acompanha.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chamado_eventos;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ---------------------------------------------------------------------
-- Permissões: "Nota Interna" segue o padrão AND (equipe técnica E toggle).
-- Técnico ganha a chave para manter o comportamento padrão (Admin/Master
-- já têm "Acesso Total"). Só adiciona; não toca no resto do array.
-- ---------------------------------------------------------------------
UPDATE public.role_definitions
SET permissions = (
  SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(permissions, '[]'::jsonb) || '["chamados:nota_interna"]'::jsonb) elem
)
WHERE name ILIKE 'Técnico'
  AND NOT (COALESCE(permissions, '[]'::jsonb) ? 'chamados:nota_interna');
