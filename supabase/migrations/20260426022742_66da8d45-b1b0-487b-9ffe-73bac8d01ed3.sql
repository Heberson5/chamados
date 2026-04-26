-- Drop old tables to reset
DROP TABLE IF EXISTS public.ticket_comments CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.department_permissions CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.positions CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.kanban_settings CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;

-- Create Enums
DO $$ BEGIN
    CREATE TYPE public.regra AS ENUM ('ADMIN', 'COMPRADOR', 'GESTOR', 'INVENTARIANTE', 'TECNICO', 'USUARIO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.chamado_status AS ENUM ('ABERTO', 'EM_ATENDIMENTO', 'ENCERRADO', 'CANCELADO', 'REABERTO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.prioridade_chamado AS ENUM ('P1', 'P2', 'P3', 'P4', 'P5');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.nivel_tecnico AS ENUM ('N1', 'N2', 'N3');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.setor AS ENUM ('ADMINISTRACAO', 'ALMOXARIFADO', 'CALL_CENTER', 'COMERCIAL', 'DEPARTAMENTO_PESSOAL', 'FINANCEIRO', 'JURIDICO', 'LOGISTICA', 'MARKETING', 'QUALIDADE', 'RECURSOS_HUMANOS', 'TECNOLOGIA_INFORMACAO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.reembolso_status AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'PAGO', 'CANCELADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.categoria_reembolso AS ENUM ('TRANSPORTE', 'ALIMENTACAO', 'HOSPEDAGEM', 'MATERIAL', 'OUTRO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update Profiles Table
ALTER TABLE public.profiles RENAME COLUMN full_name TO nome;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sobrenome TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS regra public.regra NOT NULL DEFAULT 'USUARIO';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nivel public.nivel_tecnico DEFAULT 'N1';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS setor public.setor;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ramal TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gerado_em TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMP WITH TIME ZONE;

-- Tables
CREATE TABLE public.expedientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    entrada TIMESTAMP WITH TIME ZONE NOT NULL,
    saida TIMESTAMP WITH TIME ZONE NOT NULL,
    gerado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deletado_em TIMESTAMP WITH TIME ZONE,
    ativo BOOLEAN DEFAULT true
);

CREATE TABLE public.servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT UNIQUE NOT NULL,
    descricao TEXT,
    gerado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deletado_em TIMESTAMP WITH TIME ZONE,
    ativo BOOLEAN DEFAULT true
);

CREATE TABLE public.chamados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os TEXT UNIQUE NOT NULL,
    descricao TEXT NOT NULL,
    status public.chamado_status DEFAULT 'ABERTO',
    descricao_encerramento TEXT,
    gerado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    encerrado_em TIMESTAMP WITH TIME ZONE,
    deletado_em TIMESTAMP WITH TIME ZONE,
    usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tecnico_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    prioridade public.prioridade_chamado DEFAULT 'P4',
    prioridade_alterada TIMESTAMP WITH TIME ZONE,
    prioridade_alterada_por UUID REFERENCES public.profiles(id),
    sla_deadline TIMESTAMP WITH TIME ZONE,
    sla_violado BOOLEAN DEFAULT false,
    sla_violado_em TIMESTAMP WITH TIME ZONE,
    chamado_pai_id UUID REFERENCES public.chamados(id) ON DELETE SET NULL,
    vinculado_em TIMESTAMP WITH TIME ZONE,
    vinculado_por UUID REFERENCES public.profiles(id)
);

CREATE TABLE public.ordens_de_servico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chamado_id UUID REFERENCES public.chamados(id) ON DELETE CASCADE NOT NULL,
    servico_id UUID REFERENCES public.servicos(id) ON DELETE CASCADE NOT NULL,
    gerado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deletado_em TIMESTAMP WITH TIME ZONE,
    UNIQUE(chamado_id, servico_id)
);

CREATE TABLE public.transferencias_chamado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chamado_id UUID REFERENCES public.chamados(id) ON DELETE CASCADE NOT NULL,
    tecnico_anterior_id UUID REFERENCES public.profiles(id),
    tecnico_novo_id UUID REFERENCES public.profiles(id) NOT NULL,
    motivo TEXT NOT NULL,
    transferido_por UUID REFERENCES public.profiles(id) NOT NULL,
    transferido_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.comentarios_chamado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chamado_id UUID REFERENCES public.chamados(id) ON DELETE CASCADE NOT NULL,
    autor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    comentario TEXT NOT NULL,
    visibilidade_interna BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deletado_em TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.reembolsos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero TEXT UNIQUE NOT NULL,
    descricao TEXT NOT NULL,
    categoria public.categoria_reembolso NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    status public.reembolso_status DEFAULT 'PENDENTE',
    setor public.setor,
    solicitante_id UUID REFERENCES public.profiles(id) NOT NULL,
    aprovador_id UUID REFERENCES public.profiles(id),
    aprovado_em TIMESTAMP WITH TIME ZONE,
    motivo_rejeicao TEXT,
    pagador_id UUID REFERENCES public.profiles(id),
    pago_em TIMESTAMP WITH TIME ZONE,
    comprovante_pagamento_url TEXT,
    gerado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deletado_em TIMESTAMP WITH TIME ZONE
);

-- RLS
ALTER TABLE public.expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_de_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencias_chamado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_chamado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reembolsos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin full access profiles" ON public.profiles FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.regra = 'ADMIN'));
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin full access chamados" ON public.chamados FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.regra = 'ADMIN'));
CREATE POLICY "Technicians view assigned chamados" ON public.chamados FOR SELECT USING (tecnico_id = auth.uid());
CREATE POLICY "Users view own chamados" ON public.chamados FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY "Users create chamados" ON public.chamados FOR INSERT WITH CHECK (usuario_id = auth.uid());

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_chamados BEFORE UPDATE ON public.chamados FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_servicos BEFORE UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
