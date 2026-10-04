-- =====================================================================
-- LGPD e segurança
--
-- 1. Anexos de chamados privados (sem link público permanente)
-- 2. Chamados com "dado sensível" visíveis só a solicitante, responsável
--    e Admin/Master
-- 3. Auditoria sem dados pessoais em claro + retenção configurável
-- 4. Direitos do titular: solicitações, exportação dos próprios dados,
--    anonimização de usuário
-- 5. Registro de acesso a dados pessoais, incidentes, aviso de
--    privacidade com aceite versionado
-- 6. Bloqueio de login após tentativas erradas (Auth Hook) e limite de
--    pedidos de "esqueci minha senha"
--
-- Idempotente: pode ser executada mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

-- Verdadeiro quando a sessão atual concluiu a verificação em duas etapas
-- OU quando o usuário não tem nenhum fator de MFA cadastrado. Usado para
-- proteger as telas de privacidade: quem cadastrou 2FA não consegue ler
-- dados de LGPD só com a senha.
CREATE OR REPLACE FUNCTION public.mfa_satisfeito()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      OR NOT EXISTS (
        SELECT 1 FROM auth.mfa_factors f
         WHERE f.user_id = auth.uid() AND f.status = 'verified'
      );
$$;

-- Admin/Master com a segunda etapa cumprida (quando cadastrada).
CREATE OR REPLACE FUNCTION public.is_admin_seguro()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() AND public.mfa_satisfeito();
$$;

-- ---------------------------------------------------------------------
-- 0. Proteção do próprio perfil contra escalonamento de privilégio
--
-- A política "profiles_self_all" deixa cada usuário atualizar a própria
-- linha de profiles — inclusive regra/is_master. Pela API (F12) um Usuário
-- conseguia se tornar Admin/Master. Agora só Admin/Master (ou funções de
-- borda com service_role) alteram campos de controle de acesso, e só um
-- Master pode conceder o papel de Master.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_admin boolean;
  caller_master boolean;
BEGIN
  -- Sem usuário no JWT: service_role (funções de borda), gatilhos internos,
  -- migrações e jobs agendados.
  IF auth.uid() IS NULL OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  caller_admin := public.is_admin();
  caller_master := public.check_is_master();

  IF TG_OP = 'INSERT' THEN
    IF NOT caller_admin THEN
      NEW.regra := 'USUARIO';
      NEW.is_master := false;
      NEW.admin_departments := NULL;
      NEW.pode_receber_chamados := false;
    ELSIF NOT caller_master AND (COALESCE(NEW.is_master, false) OR NEW.regra = 'MASTER') THEN
      RAISE EXCEPTION 'Apenas o Master pode criar outro Master.';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT caller_admin THEN
    IF NEW.regra IS DISTINCT FROM OLD.regra
       OR NEW.is_master IS DISTINCT FROM OLD.is_master
       OR NEW.ativo IS DISTINCT FROM OLD.ativo
       OR NEW.pode_receber_chamados IS DISTINCT FROM OLD.pode_receber_chamados
       OR NEW.admin_departments IS DISTINCT FROM OLD.admin_departments
       OR NEW.department_id IS DISTINCT FROM OLD.department_id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.must_change_password IS DISTINCT FROM OLD.must_change_password
       OR NEW.password_changed_at IS DISTINCT FROM OLD.password_changed_at
       OR NEW.access_schedule IS DISTINCT FROM OLD.access_schedule
       OR NEW.force_logout_at IS DISTINCT FROM OLD.force_logout_at
       OR NEW.deletado_em IS DISTINCT FROM OLD.deletado_em
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Você só pode alterar seus dados de contato e foto. Fale com um administrador para mudar acesso, setor ou e-mail.';
    END IF;
  ELSIF NOT caller_master
        AND (COALESCE(NEW.is_master, false) OR NEW.regra = 'MASTER')
        AND NOT (COALESCE(OLD.is_master, false) OR OLD.regra = 'MASTER') THEN
    RAISE EXCEPTION 'Apenas o Master pode conceder o papel de Master.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileges_trg ON public.profiles;
CREATE TRIGGER protect_profile_privileges_trg
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- ---------------------------------------------------------------------
-- 2. Chamado com dado sensível
-- ---------------------------------------------------------------------
ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS contem_dado_sensivel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anonimizado_em timestamptz;

DROP POLICY IF EXISTS "Dado sensivel restrito" ON public.chamados;
CREATE POLICY "Dado sensivel restrito" ON public.chamados
  AS RESTRICTIVE
  FOR ALL
  USING (
    NOT contem_dado_sensivel
    OR usuario_id = auth.uid()
    OR tecnico_id = auth.uid()
    OR public.is_admin()
  )
  WITH CHECK (
    NOT contem_dado_sensivel
    OR usuario_id = auth.uid()
    OR tecnico_id = auth.uid()
    OR public.is_admin()
  );

-- Mesma regra dentro da função usada pelas políticas de anexos/comentários.
CREATE OR REPLACE FUNCTION public.can_access_chamado(_chamado_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chamados c
    WHERE c.id = _chamado_id
      AND (
        c.usuario_id = auth.uid()
        OR c.tecnico_id = auth.uid()
        OR public.is_admin()
        OR (
          NOT c.contem_dado_sensivel
          AND (
            -- Departamento: só equipe técnica (igual à política de SELECT
            -- de chamados). Antes qualquer usuário do mesmo departamento
            -- passava por aqui e conseguia abrir anexos de colegas.
            (
              public.is_tecnico()
              AND c.department_id IS NOT NULL AND c.department_id IN (
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
        )
      )
  );
END;
$function$;

-- ---------------------------------------------------------------------
-- 1. Anexos privados
-- ---------------------------------------------------------------------

-- Os anexos de chamados/comentários passam a ser servidos apenas por link
-- temporário (signed URL). O bucket "ticket-attachments" continua público
-- porque guarda só fotos de perfil e imagens dos manuais de Ajuda.
UPDATE storage.buckets SET public = false WHERE id = 'chamados_anexos';

-- Converte os links públicos antigos gravados nos chamados/comentários em
-- caminho interno do arquivo ("<pasta>/<arquivo>"), que é o que o app
-- passa a gravar. O app também entende o formato antigo.
CREATE OR REPLACE FUNCTION public._anexo_para_caminho(_valor text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _valor ~ '/storage/v1/object/(public|sign|authenticated)/chamados_anexos/'
      THEN split_part(regexp_replace(_valor, '^.*/storage/v1/object/(public|sign|authenticated)/chamados_anexos/', ''), '?', 1)
    ELSE _valor
  END;
$$;

UPDATE public.chamados
   SET anexos = ARRAY(SELECT public._anexo_para_caminho(a) FROM unnest(anexos) a)
 WHERE anexos IS NOT NULL
   AND EXISTS (SELECT 1 FROM unnest(anexos) a WHERE a LIKE '%/chamados_anexos/%');

UPDATE public.comentarios_chamado
   SET anexos = ARRAY(SELECT public._anexo_para_caminho(a) FROM unnest(anexos) a)
 WHERE anexos IS NOT NULL
   AND EXISTS (SELECT 1 FROM unnest(anexos) a WHERE a LIKE '%/chamados_anexos/%');

CREATE INDEX IF NOT EXISTS chamados_anexos_gin ON public.chamados USING gin (anexos);
CREATE INDEX IF NOT EXISTS comentarios_anexos_gin ON public.comentarios_chamado USING gin (anexos);

-- Pode ver o arquivo quem pode ver o chamado/comentário que o referencia.
-- Nota interna só para equipe técnica.
CREATE OR REPLACE FUNCTION public.can_access_anexo(_caminho text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
           SELECT 1 FROM public.chamados c
            WHERE c.anexos @> ARRAY[_caminho]
              AND public.can_access_chamado(c.id)
         )
      OR EXISTS (
           SELECT 1 FROM public.comentarios_chamado cm
            WHERE cm.anexos @> ARRAY[_caminho]
              AND public.can_access_chamado(cm.chamado_id)
              AND (NOT COALESCE(cm.visibilidade_interna, false) OR public.is_tecnico())
         );
$$;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Ticket participants read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Ticket participants upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chamados attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own chamados attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anexos: leitura por participantes" ON storage.objects;
DROP POLICY IF EXISTS "Anexos: envio para a propria pasta" ON storage.objects;
DROP POLICY IF EXISTS "Anexos: remocao pelo dono ou admin" ON storage.objects;
DROP POLICY IF EXISTS "Arquivos publicos: leitura" ON storage.objects;
DROP POLICY IF EXISTS "Arquivos publicos: envio" ON storage.objects;
DROP POLICY IF EXISTS "Arquivos publicos: atualizacao" ON storage.objects;
DROP POLICY IF EXISTS "Arquivos publicos: remocao" ON storage.objects;

CREATE POLICY "Anexos: leitura por participantes" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chamados_anexos'
    AND (
      owner = auth.uid()
      OR public.is_admin()
      OR public.can_access_anexo(name)
    )
  );

-- Cada usuário envia para a própria pasta ("<id>/..." ou
-- "comments/<id>/..."); o arquivo só fica visível a terceiros depois que
-- um chamado/comentário acessível passa a referenciá-lo.
CREATE POLICY "Anexos: envio para a propria pasta" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chamados_anexos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR ((storage.foldername(name))[1] = 'comments' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

CREATE POLICY "Anexos: remocao pelo dono ou admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chamados_anexos' AND (owner = auth.uid() OR public.is_admin()));

-- ticket-attachments: fotos de perfil (pasta = id do usuário) e imagens dos
-- manuais (pasta "help"). Leitura pública pelo link, escrita controlada.
CREATE POLICY "Arquivos publicos: leitura" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Arquivos publicos: envio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
      OR ((storage.foldername(name))[1] = 'help' AND public.is_tecnico())
    )
  );

CREATE POLICY "Arquivos publicos: atualizacao" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

CREATE POLICY "Arquivos publicos: remocao" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

-- ---------------------------------------------------------------------
-- 3. Auditoria sem dados pessoais em claro
-- ---------------------------------------------------------------------

-- Substitui campos pessoais por uma "impressão digital" curta: dá para ver
-- que o valor mudou (e comparar antes/depois) sem expor o conteúdo.
CREATE OR REPLACE FUNCTION public.lgpd_redigir(_tabela text, _dados jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, extensions
AS $$
DECLARE
  campos text[];
  campo text;
  resultado jsonb := _dados;
BEGIN
  IF _dados IS NULL THEN
    RETURN NULL;
  END IF;

  campos := CASE _tabela
    WHEN 'profiles' THEN ARRAY['email', 'telefone', 'ramal', 'cidade', 'avatar_url', 'access_schedule', 'settings']
    WHEN 'chamados' THEN ARRAY['descricao', 'descricao_encerramento', 'anexos']
    WHEN 'comentarios_chamado' THEN ARRAY['comentario', 'anexos']
    WHEN 'lgpd_solicitacoes' THEN ARRAY['titular_email', 'descricao', 'resposta']
    WHEN 'lgpd_incidentes' THEN ARRAY['descricao']
    ELSE ARRAY[]::text[]
  END;

  -- Senhas/tokens nunca entram no log, em nenhuma tabela.
  campos := campos || ARRAY['password', 'senha', 'encrypted_password', 'token', 'api_key', 'secret'];

  FOREACH campo IN ARRAY campos LOOP
    IF resultado ? campo AND resultado -> campo <> 'null'::jsonb THEN
      resultado := jsonb_set(
        resultado,
        ARRAY[campo],
        to_jsonb('[protegido:' || left(md5((resultado -> campo)::text), 8) || ']')
      );
    END IF;
  END LOOP;

  RETURN resultado;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    current_auth_user_id UUID := COALESCE(auth.uid(), (NULLIF(current_setting('app.current_user_id', true), ''))::uuid);
    current_user_id BIGINT;
    current_user_email TEXT;
BEGIN
    IF current_auth_user_id IS NOT NULL THEN
        SELECT id_numerico, email
          INTO current_user_id, current_user_email
          FROM public.profiles
         WHERE user_id = current_auth_user_id OR id = current_auth_user_id
         LIMIT 1;
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (user_id, auth_user_id, user_email, action, table_name, record_id, new_data)
        VALUES (current_user_id, current_auth_user_id, current_user_email, 'INSERT', TG_TABLE_NAME, NEW.id::TEXT,
                public.lgpd_redigir(TG_TABLE_NAME, to_jsonb(NEW)));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (user_id, auth_user_id, user_email, action, table_name, record_id, old_data, new_data)
        VALUES (current_user_id, current_auth_user_id, current_user_email, 'UPDATE', TG_TABLE_NAME, OLD.id::TEXT,
                public.lgpd_redigir(TG_TABLE_NAME, to_jsonb(OLD)), public.lgpd_redigir(TG_TABLE_NAME, to_jsonb(NEW)));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (user_id, auth_user_id, user_email, action, table_name, record_id, old_data)
        VALUES (current_user_id, current_auth_user_id, current_user_email, 'DELETE', TG_TABLE_NAME, OLD.id::TEXT,
                public.lgpd_redigir(TG_TABLE_NAME, to_jsonb(OLD)));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$;

-- Limpa o que já foi gravado em claro.
UPDATE public.audit_logs
   SET old_data = public.lgpd_redigir(table_name, old_data),
       new_data = public.lgpd_redigir(table_name, new_data)
 WHERE table_name IN ('profiles', 'chamados', 'comentarios_chamado')
   AND (old_data IS NOT NULL OR new_data IS NOT NULL);

-- Passa a auditar também chamados/comentários (antes só alguns cadastros).
DROP TRIGGER IF EXISTS audit_comentarios_chamado_trigger ON public.comentarios_chamado;
CREATE TRIGGER audit_comentarios_chamado_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.comentarios_chamado
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Registra uma ação de usuário (ex.: exportação de backup) sem depender de
-- política de INSERT aberta em audit_logs.
CREATE OR REPLACE FUNCTION public.registrar_auditoria(_acao text, _detalhe jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_num bigint;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  SELECT id_numerico, email INTO v_num, v_email FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_logs (user_id, auth_user_id, user_email, action, table_name, new_data)
  VALUES (v_num, auth.uid(), v_email, left(_acao, 60), 'lgpd', _detalhe);
END;
$$;

-- ---------------------------------------------------------------------
-- 4/5. Tabelas de LGPD
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lgpd_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo bigint GENERATED ALWAYS AS IDENTITY,
  titular_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  titular_nome text,
  titular_email text,
  tipo text NOT NULL CHECK (tipo IN ('confirmacao', 'acesso', 'correcao', 'anonimizacao', 'exclusao', 'portabilidade', 'informacao_compartilhamento', 'revogacao_consentimento', 'oposicao')),
  descricao text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'recusada')),
  resposta text,
  prazo date NOT NULL DEFAULT (current_date + 15),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  respondido_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  respondido_em timestamptz
);
ALTER TABLE public.lgpd_solicitacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Titular ve as proprias solicitacoes" ON public.lgpd_solicitacoes;
CREATE POLICY "Titular ve as proprias solicitacoes" ON public.lgpd_solicitacoes
  FOR SELECT TO authenticated USING (titular_id = auth.uid());
DROP POLICY IF EXISTS "Titular abre solicitacao" ON public.lgpd_solicitacoes;
CREATE POLICY "Titular abre solicitacao" ON public.lgpd_solicitacoes
  FOR INSERT TO authenticated
  WITH CHECK (titular_id = auth.uid() AND status = 'pendente' AND resposta IS NULL AND respondido_por IS NULL);
DROP POLICY IF EXISTS "Admin gerencia solicitacoes" ON public.lgpd_solicitacoes;
CREATE POLICY "Admin gerencia solicitacoes" ON public.lgpd_solicitacoes
  FOR ALL TO authenticated USING (public.is_admin_seguro()) WITH CHECK (public.is_admin_seguro());

CREATE OR REPLACE FUNCTION public.lgpd_touch_atualizado_em()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS lgpd_solicitacoes_touch ON public.lgpd_solicitacoes;
CREATE TRIGGER lgpd_solicitacoes_touch BEFORE UPDATE ON public.lgpd_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.lgpd_touch_atualizado_em();

DROP TRIGGER IF EXISTS audit_lgpd_solicitacoes_trigger ON public.lgpd_solicitacoes;
CREATE TRIGGER audit_lgpd_solicitacoes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.lgpd_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Registro de operações de acesso a dados pessoais de terceiros (art. 37).
CREATE TABLE IF NOT EXISTS public.lgpd_acessos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ator_id uuid,
  ator_email text,
  titular_id uuid,
  recurso text NOT NULL,
  detalhe text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lgpd_acessos_titular_idx ON public.lgpd_acessos (titular_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS lgpd_acessos_criado_idx ON public.lgpd_acessos (criado_em DESC);
ALTER TABLE public.lgpd_acessos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin le registros de acesso" ON public.lgpd_acessos;
CREATE POLICY "Admin le registros de acesso" ON public.lgpd_acessos
  FOR SELECT TO authenticated USING (public.is_admin_seguro());
DROP POLICY IF EXISTS "Titular ve quem acessou seus dados" ON public.lgpd_acessos;
CREATE POLICY "Titular ve quem acessou seus dados" ON public.lgpd_acessos
  FOR SELECT TO authenticated USING (titular_id = auth.uid());

CREATE OR REPLACE FUNCTION public.lgpd_registrar_acesso(_titular uuid, _recurso text, _detalhe text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR _titular IS NULL OR _titular = auth.uid() THEN
    RETURN;
  END IF;
  INSERT INTO public.lgpd_acessos (ator_id, ator_email, titular_id, recurso, detalhe)
  SELECT auth.uid(), p.email, _titular, left(_recurso, 40), left(_detalhe, 300)
    FROM public.profiles p WHERE p.id = auth.uid();
END;
$$;

-- Incidentes de segurança com dados pessoais.
CREATE TABLE IF NOT EXISTS public.lgpd_incidentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  detectado_em timestamptz NOT NULL DEFAULT now(),
  categorias_dados text,
  titulares_afetados integer,
  severidade text NOT NULL DEFAULT 'media' CHECK (severidade IN ('baixa', 'media', 'alta', 'critica')),
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_analise', 'comunicado', 'encerrado')),
  medidas text,
  comunicado_anpd_em timestamptz,
  comunicado_titulares_em timestamptz,
  criado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lgpd_incidentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin gerencia incidentes" ON public.lgpd_incidentes;
CREATE POLICY "Admin gerencia incidentes" ON public.lgpd_incidentes
  FOR ALL TO authenticated USING (public.is_admin_seguro()) WITH CHECK (public.is_admin_seguro());
DROP TRIGGER IF EXISTS lgpd_incidentes_touch ON public.lgpd_incidentes;
CREATE TRIGGER lgpd_incidentes_touch BEFORE UPDATE ON public.lgpd_incidentes
  FOR EACH ROW EXECUTE FUNCTION public.lgpd_touch_atualizado_em();
DROP TRIGGER IF EXISTS audit_lgpd_incidentes_trigger ON public.lgpd_incidentes;
CREATE TRIGGER audit_lgpd_incidentes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.lgpd_incidentes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Ciência do aviso de privacidade (por versão).
CREATE TABLE IF NOT EXISTS public.lgpd_aceites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  versao text NOT NULL,
  aceito_em timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  UNIQUE (user_id, versao)
);
ALTER TABLE public.lgpd_aceites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuario registra o proprio aceite" ON public.lgpd_aceites;
CREATE POLICY "Usuario registra o proprio aceite" ON public.lgpd_aceites
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Usuario ve os proprios aceites" ON public.lgpd_aceites;
CREATE POLICY "Usuario ve os proprios aceites" ON public.lgpd_aceites
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_seguro());

-- Arquivos que a rotina de retenção desvinculou e que a função
-- "lgpd-retencao" deve apagar do Storage (só service_role acessa).
CREATE TABLE IF NOT EXISTS public.lgpd_arquivos_remover (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bucket text NOT NULL,
  caminho text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lgpd_arquivos_remover ENABLE ROW LEVEL SECURITY;

-- Configuração padrão (editável na tela Privacidade).
INSERT INTO public.system_settings (key, value)
VALUES (
  'lgpd_settings',
  jsonb_build_object(
    'retencao_auditoria_dias', 365,
    'retencao_acessos_dias', 730,
    'anonimizar_chamados_apos_dias', 1825,
    'remover_anexos_apos_dias', 730,
    'exigir_mfa_admin', false
  )
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value)
VALUES (
  'privacy_notice',
  jsonb_build_object(
    'versao', '1',
    'atualizado_em', to_char(now(), 'YYYY-MM-DD'),
    'encarregado_nome', '',
    'encarregado_email', '',
    'texto',
    E'Este sistema trata dados pessoais (nome, e-mail, telefone, setor e o conteúdo dos chamados) para viabilizar o atendimento de suporte técnico da empresa.\n\n'
    || E'Base legal: execução de contrato de trabalho/prestação de serviço e legítimo interesse na operação de TI (LGPD, art. 7º, V e IX).\n\n'
    || E'Os dados são acessados apenas pela equipe de suporte e administradores, ficam armazenados com controle de acesso e são retidos pelos prazos definidos pela empresa, após os quais são anonimizados ou excluídos.\n\n'
    || E'Você pode, a qualquer momento, consultar, corrigir, exportar ou pedir a anonimização dos seus dados em "Meu perfil > Privacidade e meus dados", ou falar com o encarregado de dados (DPO).'
  )
)
ON CONFLICT (key) DO NOTHING;

-- O aviso precisa ser lido na tela de login (antes de autenticar).
DROP POLICY IF EXISTS "Public branding settings readable by anon" ON public.system_settings;
CREATE POLICY "Public branding settings readable by anon" ON public.system_settings
  FOR SELECT TO anon
  USING (key = ANY (ARRAY['layout_settings', 'landing_page_settings', 'privacy_notice']));

-- ---------------------------------------------------------------------
-- Direitos do titular
-- ---------------------------------------------------------------------

-- Exporta, em JSON, os dados do próprio usuário (art. 18, II e V).
CREATE OR REPLACE FUNCTION public.lgpd_meus_dados()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;

  RETURN jsonb_build_object(
    'gerado_em', now(),
    'perfil', (
      SELECT to_jsonb(p) - 'settings' - 'access_schedule'
        FROM public.profiles p WHERE p.id = me
    ),
    'chamados_abertos_por_mim', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'os', c.os, 'titulo', c.titulo, 'descricao', c.descricao, 'status', c.status,
        'gerado_em', c.gerado_em, 'encerrado_em', c.encerrado_em, 'anexos', c.anexos
      ) ORDER BY c.gerado_em)
        FROM public.chamados c WHERE c.usuario_id = me AND c.deletado_em IS NULL
    ), '[]'::jsonb),
    'meus_comentarios', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'chamado_id', cm.chamado_id, 'comentario', cm.comentario, 'criado_em', cm.criado_em
      ) ORDER BY cm.criado_em)
        FROM public.comentarios_chamado cm WHERE cm.autor_id = me AND cm.deletado_em IS NULL
    ), '[]'::jsonb),
    'aceites_aviso_privacidade', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('versao', a.versao, 'aceito_em', a.aceito_em))
        FROM public.lgpd_aceites a WHERE a.user_id = me
    ), '[]'::jsonb),
    'solicitacoes_lgpd', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'protocolo', s.protocolo, 'tipo', s.tipo, 'status', s.status, 'criado_em', s.criado_em, 'resposta', s.resposta
      ) ORDER BY s.criado_em)
        FROM public.lgpd_solicitacoes s WHERE s.titular_id = me
    ), '[]'::jsonb),
    'minhas_avaliacoes', CASE WHEN to_regclass('public.chamado_avaliacoes') IS NULL THEN '[]'::jsonb ELSE COALESCE((
      SELECT jsonb_agg(jsonb_build_object('chamado_id', av.chamado_id, 'nota', av.nota, 'comentario', av.comentario, 'criado_em', av.criado_em))
        FROM public.chamado_avaliacoes av WHERE av.usuario_id = me
    ), '[]'::jsonb) END,
    'acessos_aos_meus_dados', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'quem', a.ator_email, 'recurso', a.recurso, 'detalhe', a.detalhe, 'quando', a.criado_em
      ) ORDER BY a.criado_em DESC)
        FROM public.lgpd_acessos a WHERE a.titular_id = me
    ), '[]'::jsonb)
  );
END;
$$;

-- Anonimiza um usuário: remove nome, contato e acesso, mantendo o
-- histórico dos chamados sem identificar a pessoa. Opcionalmente apaga o
-- texto dos chamados/comentários que ela escreveu.
CREATE OR REPLACE FUNCTION public.lgpd_anonimizar_usuario(_user uuid, _apagar_conteudo boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  alvo public.profiles%ROWTYPE;
  novo_email text;
  n_chamados integer := 0;
  n_comentarios integer := 0;
BEGIN
  IF NOT public.is_admin_seguro() THEN
    RAISE EXCEPTION 'Apenas Admin/Master (com verificação em duas etapas, se cadastrada) pode anonimizar usuários.';
  END IF;
  IF _user = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível anonimizar o próprio usuário.';
  END IF;

  SELECT * INTO alvo FROM public.profiles WHERE id = _user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;
  IF alvo.is_master OR alvo.regra = 'MASTER' THEN
    RAISE EXCEPTION 'O usuário Master não pode ser anonimizado.';
  END IF;

  novo_email := 'anonimo-' || COALESCE(alvo.id_numerico::text, left(_user::text, 8)) || '@removido.invalid';

  UPDATE public.profiles
     SET nome = 'Usuário',
         sobrenome = 'removido #' || COALESCE(alvo.id_numerico::text, left(_user::text, 8)),
         email = novo_email,
         telefone = NULL,
         ramal = NULL,
         cidade = NULL,
         avatar_url = NULL,
         settings = '{}'::jsonb,
         access_schedule = NULL,
         ativo = false,
         pode_receber_chamados = false,
         deletado_em = COALESCE(deletado_em, now())
   WHERE id = _user;

  UPDATE auth.users
     SET email = novo_email,
         phone = NULL,
         raw_user_meta_data = '{}'::jsonb,
         encrypted_password = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
         banned_until = 'infinity'::timestamptz,
         updated_at = now()
   WHERE id = _user;

  UPDATE auth.identities
     SET identity_data = COALESCE(identity_data, '{}'::jsonb) || jsonb_build_object('email', novo_email)
   WHERE user_id = _user;
  DELETE FROM auth.sessions WHERE user_id = _user;
  -- Recursos opcionais (criados pela migração de recursos de chamados).
  IF to_regclass('public.push_subscriptions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.push_subscriptions WHERE user_id = $1' USING _user;
  END IF;
  IF to_regclass('public.chamado_avaliacoes') IS NOT NULL AND _apagar_conteudo THEN
    EXECUTE 'UPDATE public.chamado_avaliacoes SET comentario = NULL WHERE usuario_id = $1' USING _user;
  END IF;

  UPDATE public.audit_logs SET user_email = novo_email WHERE auth_user_id = _user;
  UPDATE public.lgpd_acessos SET ator_email = novo_email WHERE ator_id = _user;
  UPDATE public.lgpd_solicitacoes
     SET titular_nome = 'Titular anonimizado', titular_email = novo_email
   WHERE titular_id = _user;

  IF _apagar_conteudo THEN
    UPDATE public.chamados
       SET descricao = '[conteúdo removido a pedido do titular]',
           anexos = NULL,
           anonimizado_em = now()
     WHERE usuario_id = _user;
    GET DIAGNOSTICS n_chamados = ROW_COUNT;

    UPDATE public.comentarios_chamado
       SET comentario = '[conteúdo removido a pedido do titular]',
           anexos = NULL
     WHERE autor_id = _user;
    GET DIAGNOSTICS n_comentarios = ROW_COUNT;
  END IF;

  PERFORM public.registrar_auditoria('LGPD_ANONIMIZACAO', jsonb_build_object(
    'usuario', _user, 'apagar_conteudo', _apagar_conteudo,
    'chamados', n_chamados, 'comentarios', n_comentarios
  ));

  RETURN jsonb_build_object('email', novo_email, 'chamados', n_chamados, 'comentarios', n_comentarios);
END;
$$;

-- ---------------------------------------------------------------------
-- Retenção
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lgpd_aplicar_retencao()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg jsonb;
  d_auditoria integer;
  d_acessos integer;
  d_chamados integer;
  d_anexos integer;
  n_auditoria integer := 0;
  n_acessos integer := 0;
  n_chamados integer := 0;
  n_anexos integer := 0;
BEGIN
  -- Admin/Master pelo app, service_role (função de borda) ou agendamento
  -- direto no banco (pg_cron, sem JWT).
  IF NOT (
    public.is_admin_seguro()
    OR auth.role() = 'service_role'
    OR (auth.uid() IS NULL AND COALESCE(auth.role(), '') NOT IN ('anon', 'authenticated'))
  ) THEN
    RAISE EXCEPTION 'Sem permissão para aplicar a política de retenção.';
  END IF;

  SELECT value INTO cfg FROM public.system_settings WHERE key = 'lgpd_settings';
  cfg := COALESCE(cfg, '{}'::jsonb);
  d_auditoria := NULLIF(cfg ->> 'retencao_auditoria_dias', '')::integer;
  d_acessos := NULLIF(cfg ->> 'retencao_acessos_dias', '')::integer;
  d_chamados := NULLIF(cfg ->> 'anonimizar_chamados_apos_dias', '')::integer;
  d_anexos := NULLIF(cfg ->> 'remover_anexos_apos_dias', '')::integer;

  IF d_auditoria IS NOT NULL AND d_auditoria > 0 THEN
    DELETE FROM public.audit_logs WHERE created_at < now() - make_interval(days => d_auditoria);
    GET DIAGNOSTICS n_auditoria = ROW_COUNT;
  END IF;

  IF d_acessos IS NOT NULL AND d_acessos > 0 THEN
    DELETE FROM public.lgpd_acessos WHERE criado_em < now() - make_interval(days => d_acessos);
    GET DIAGNOSTICS n_acessos = ROW_COUNT;
  END IF;

  -- Anexos de chamados encerrados/cancelados há mais de N dias.
  IF d_anexos IS NOT NULL AND d_anexos > 0 THEN
    WITH alvo AS (
      SELECT c.id FROM public.chamados c
       WHERE c.encerrado_em IS NOT NULL
         AND c.encerrado_em < now() - make_interval(days => d_anexos)
    ),
    arquivos AS (
      SELECT unnest(c.anexos) AS caminho FROM public.chamados c JOIN alvo USING (id) WHERE c.anexos IS NOT NULL
      UNION
      SELECT unnest(cm.anexos) FROM public.comentarios_chamado cm JOIN alvo a ON a.id = cm.chamado_id WHERE cm.anexos IS NOT NULL
    )
    INSERT INTO public.lgpd_arquivos_remover (bucket, caminho)
    SELECT 'chamados_anexos', public._anexo_para_caminho(caminho)
      FROM arquivos
     WHERE caminho NOT LIKE 'http%';
    GET DIAGNOSTICS n_anexos = ROW_COUNT;

    UPDATE public.chamados SET anexos = NULL
     WHERE anexos IS NOT NULL AND encerrado_em IS NOT NULL
       AND encerrado_em < now() - make_interval(days => d_anexos);
    UPDATE public.comentarios_chamado cm SET anexos = NULL
      FROM public.chamados c
     WHERE c.id = cm.chamado_id AND cm.anexos IS NOT NULL
       AND c.encerrado_em IS NOT NULL
       AND c.encerrado_em < now() - make_interval(days => d_anexos);
  END IF;

  -- Texto de chamados antigos: mantém título, datas e métricas (relatórios
  -- continuam funcionando), remove descrição e conversas.
  IF d_chamados IS NOT NULL AND d_chamados > 0 THEN
    UPDATE public.comentarios_chamado cm
       SET comentario = '[removido pela política de retenção]'
      FROM public.chamados c
     WHERE c.id = cm.chamado_id
       AND c.anonimizado_em IS NULL
       AND c.encerrado_em IS NOT NULL
       AND c.encerrado_em < now() - make_interval(days => d_chamados);

    UPDATE public.chamados
       SET descricao = '[removido pela política de retenção]',
           descricao_encerramento = CASE WHEN descricao_encerramento IS NULL THEN NULL ELSE '[removido pela política de retenção]' END,
           anonimizado_em = now()
     WHERE anonimizado_em IS NULL
       AND encerrado_em IS NOT NULL
       AND encerrado_em < now() - make_interval(days => d_chamados);
    GET DIAGNOSTICS n_chamados = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'executado_em', now(),
    'logs_auditoria_removidos', n_auditoria,
    'registros_acesso_removidos', n_acessos,
    'chamados_anonimizados', n_chamados,
    'arquivos_para_remover', n_anexos
  );
END;
$$;

-- Agenda a retenção diária quando o pg_cron estiver disponível no projeto.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'lgpd-retencao-diaria';
    PERFORM cron.schedule('lgpd-retencao-diaria', '30 3 * * *', 'select public.lgpd_aplicar_retencao()');
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'pg_cron indisponível (%). Rode a retenção pela tela Privacidade ou agende a função lgpd-retencao.', SQLERRM;
END $$;

-- ---------------------------------------------------------------------
-- 6. Bloqueio após tentativas de login erradas
--    Ative em: Supabase > Authentication > Hooks >
--    "Password Verification Attempt" -> public.hook_password_verification_attempt
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_tentativas_login (
  user_id uuid PRIMARY KEY,
  falhas integer NOT NULL DEFAULT 0,
  ultima_falha timestamptz,
  bloqueado_ate timestamptz
);
ALTER TABLE public.auth_tentativas_login ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin le bloqueios de login" ON public.auth_tentativas_login;
CREATE POLICY "Admin le bloqueios de login" ON public.auth_tentativas_login
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.hook_password_verification_attempt(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_user uuid := (event ->> 'user_id')::uuid;
  v_valido boolean := COALESCE((event ->> 'valid')::boolean, false);
  reg public.auth_tentativas_login%ROWTYPE;
  max_falhas constant integer := 5;
  janela constant interval := interval '15 minutes';
BEGIN
  SELECT * INTO reg FROM public.auth_tentativas_login WHERE user_id = v_user;

  IF FOUND AND reg.bloqueado_ate IS NOT NULL AND reg.bloqueado_ate > now() THEN
    RETURN jsonb_build_object(
      'decision', 'reject',
      'message', 'Muitas tentativas de login. Tente novamente em alguns minutos.',
      'should_logout_user', false
    );
  END IF;

  IF v_valido THEN
    DELETE FROM public.auth_tentativas_login WHERE user_id = v_user;
    RETURN jsonb_build_object('decision', 'continue');
  END IF;

  INSERT INTO public.auth_tentativas_login AS t (user_id, falhas, ultima_falha)
  VALUES (v_user, 1, now())
  ON CONFLICT (user_id) DO UPDATE
     SET falhas = CASE WHEN t.ultima_falha < now() - janela THEN 1 ELSE t.falhas + 1 END,
         ultima_falha = now(),
         bloqueado_ate = CASE
           WHEN (CASE WHEN t.ultima_falha < now() - janela THEN 1 ELSE t.falhas + 1 END) >= max_falhas
             THEN now() + janela
           ELSE NULL
         END;

  RETURN jsonb_build_object('decision', 'continue');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.hook_password_verification_attempt(jsonb) FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
    GRANT EXECUTE ON FUNCTION public.hook_password_verification_attempt(jsonb) TO supabase_auth_admin;
    GRANT ALL ON TABLE public.auth_tentativas_login TO supabase_auth_admin;
    EXECUTE 'DROP POLICY IF EXISTS "Auth hook gerencia tentativas" ON public.auth_tentativas_login';
    EXECUTE 'CREATE POLICY "Auth hook gerencia tentativas" ON public.auth_tentativas_login FOR ALL TO supabase_auth_admin USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- Desbloqueio manual pela tela de Usuários.
CREATE OR REPLACE FUNCTION public.desbloquear_login(_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;
  DELETE FROM public.auth_tentativas_login WHERE user_id = _user;
END;
$$;

-- Limite de pedidos de "esqueci minha senha" (controlado pela função de
-- borda forgot-password, com service_role).
CREATE TABLE IF NOT EXISTS public.password_reset_tentativas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  ip text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_tentativas_email_idx ON public.password_reset_tentativas (lower(email), criado_em DESC);
CREATE INDEX IF NOT EXISTS password_reset_tentativas_ip_idx ON public.password_reset_tentativas (ip, criado_em DESC);
ALTER TABLE public.password_reset_tentativas ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- Permissões de execução
-- ---------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.lgpd_aplicar_retencao() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lgpd_anonimizar_usuario(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lgpd_meus_dados() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lgpd_registrar_acesso(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.registrar_auditoria(text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.desbloquear_login(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lgpd_aplicar_retencao() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lgpd_anonimizar_usuario(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lgpd_meus_dados() TO authenticated;
GRANT EXECUTE ON FUNCTION public.lgpd_registrar_acesso(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_auditoria(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desbloquear_login(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mfa_satisfeito() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_seguro() TO authenticated;
