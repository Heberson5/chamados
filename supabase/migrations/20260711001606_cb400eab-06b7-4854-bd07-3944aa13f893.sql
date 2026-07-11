
CREATE TABLE IF NOT EXISTS public.chamado_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#6b7280',
  ordem INTEGER NOT NULL DEFAULT 0,
  is_inicial BOOLEAN NOT NULL DEFAULT false,
  is_pausa BOOLEAN NOT NULL DEFAULT false,
  is_encerrado BOOLEAN NOT NULL DEFAULT false,
  is_cancelado BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  legacy_enum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.chamado_statuses TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chamado_statuses TO authenticated;
GRANT ALL ON public.chamado_statuses TO service_role;

ALTER TABLE public.chamado_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chamado_statuses_read_all"
  ON public.chamado_statuses FOR SELECT USING (true);
CREATE POLICY "chamado_statuses_master_write"
  ON public.chamado_statuses FOR ALL TO authenticated
  USING (public.check_is_master()) WITH CHECK (public.check_is_master());

CREATE TRIGGER chamado_statuses_updated_at
  BEFORE UPDATE ON public.chamado_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX IF NOT EXISTS chamado_statuses_unique_inicial
  ON public.chamado_statuses ((true)) WHERE is_inicial = true;
CREATE UNIQUE INDEX IF NOT EXISTS chamado_statuses_unique_pausa
  ON public.chamado_statuses ((true)) WHERE is_pausa = true;

INSERT INTO public.chamado_statuses (key, label, cor, ordem, is_inicial, is_pausa, is_encerrado, is_cancelado, legacy_enum) VALUES
  ('aguardando',         'Aguardando',         '#f59e0b', 1, true,  false, false, false, 'ABERTO'),
  ('em_atendimento',     'Em atendimento',     '#3b82f6', 2, false, false, false, false, 'EM_ATENDIMENTO'),
  ('aguardando_usuario', 'Aguardando usuário', '#8b5cf6', 3, false, false, false, false, 'AGUARDANDO_USUARIO'),
  ('suspenso',           'Suspenso',           '#eab308', 4, false, true,  false, false, 'PAUSADO'),
  ('reaberto',           'Reaberto',           '#ec4899', 5, false, false, false, false, 'REABERTO'),
  ('encerrado',          'Encerrado',          '#10b981', 6, false, false, true,  false, 'ENCERRADO'),
  ('cancelado',          'Cancelado',          '#ef4444', 7, false, false, false, true,  'CANCELADO')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES public.chamado_statuses(id),
  ADD COLUMN IF NOT EXISTS previsao_conclusao TIMESTAMPTZ;

UPDATE public.chamados c
   SET status_id = s.id
  FROM public.chamado_statuses s
 WHERE c.status_id IS NULL AND s.legacy_enum = c.status::text;

CREATE INDEX IF NOT EXISTS chamados_status_id_idx ON public.chamados(status_id);
CREATE INDEX IF NOT EXISTS chamados_previsao_idx ON public.chamados(previsao_conclusao);

CREATE TABLE IF NOT EXISTS public.backup_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('export_json','export_csv','import_json')),
  status TEXT NOT NULL DEFAULT 'iniciado' CHECK (status IN ('iniciado','sucesso','erro')),
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMPTZ,
  tamanho_bytes BIGINT,
  destino TEXT NOT NULL DEFAULT 'download' CHECK (destino IN ('download','storage')),
  storage_path TEXT,
  tabelas_incluidas TEXT[],
  total_registros INTEGER,
  erro TEXT,
  usuario_id UUID,
  usuario_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.backup_logs TO authenticated;
GRANT ALL ON public.backup_logs TO service_role;

ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backup_logs_master_all"
  ON public.backup_logs FOR ALL TO authenticated
  USING (public.check_is_master()) WITH CHECK (public.check_is_master());

CREATE INDEX IF NOT EXISTS backup_logs_iniciado_idx ON public.backup_logs (iniciado_em DESC);

INSERT INTO public.system_settings (key, value)
VALUES ('backup_config', jsonb_build_object('destino','download','bucket','backups'))
ON CONFLICT (key) DO NOTHING;

UPDATE public.role_definitions
   SET permissions = CASE
       WHEN permissions ? 'backup' THEN permissions
       ELSE permissions || '["backup"]'::jsonb
     END
 WHERE lower(name) = 'master';
