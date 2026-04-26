-- Update hebersohas@gmail.com to be ADMIN
UPDATE public.profiles 
SET regra = 'ADMIN', is_master = true 
WHERE email = 'hebersohas@gmail.com';

-- Inventory Tables
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT UNIQUE NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    email TEXT,
    telefone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.itens_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero TEXT UNIQUE NOT NULL, -- e.g., INV-000001
    nome TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    descricao TEXT,
    unidade TEXT NOT NULL, -- UN, KG, M, CX, L, PC
    estoque_atual INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 0,
    categoria_id UUID REFERENCES public.categorias(id),
    oc_numero TEXT,
    criado_por UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.itens_inventario(id),
    tipo TEXT NOT NULL, -- ENTRADA, SAIDA
    motivo TEXT NOT NULL, -- COMPRA, ENTRADA_MANUAL, BAIXA, AJUSTE, DESTINACAO
    quantidade INTEGER NOT NULL,
    estoque_before INTEGER NOT NULL,
    estoque_after INTEGER NOT NULL,
    referencia_id TEXT,
    realizado_por UUID REFERENCES public.profiles(id),
    observacoes TEXT,
    setor_destino_id TEXT,
    setor_destino_nome TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.estoque_setor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_inventario_id UUID REFERENCES public.itens_inventario(id),
    setor TEXT NOT NULL,
    quantidade INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(item_inventario_id, setor)
);

CREATE TABLE IF NOT EXISTS public.solicitacoes_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ac_numero TEXT UNIQUE NOT NULL,
    oc_numero TEXT UNIQUE,
    solicitado_por UUID REFERENCES public.profiles(id),
    setor_solicitante TEXT,
    fornecedor_id UUID REFERENCES public.fornecedores(id),
    status TEXT DEFAULT 'PENDENTE', -- PENDENTE, APROVADO, REJEITADO, COMPRADO, CANCELADO
    justificativa TEXT,
    nfe TEXT,
    data_emissao TIMESTAMP WITH TIME ZONE,
    forma_pagamento TEXT,
    parcelas INTEGER,
    aprovado_por UUID REFERENCES public.profiles(id),
    aprovado_em TIMESTAMP WITH TIME ZONE,
    rejeitado_por UUID REFERENCES public.profiles(id),
    rejeitado_em TIMESTAMP WITH TIME ZONE,
    motivo_rejeicao TEXT,
    executado_por UUID REFERENCES public.profiles(id),
    executado_em TIMESTAMP WITH TIME ZONE,
    valor_total DECIMAL(10,2),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.itens_solicitacao_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_compra_id UUID REFERENCES public.solicitacoes_compra(id) ON DELETE CASCADE,
    item_inventario_id UUID REFERENCES public.itens_inventario(id),
    nome_produto TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    preco_estimado DECIMAL(10,2),
    preco_real DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.baixas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    av_numero TEXT UNIQUE,
    solicitado_por UUID REFERENCES public.profiles(id),
    perfil_solicitante TEXT NOT NULL,
    status TEXT DEFAULT 'PENDENTE', -- PENDENTE, APROVADO_TECNICO, APROVADO_GESTOR, CONCLUIDO, REJEITADO
    justificativa TEXT NOT NULL,
    aprovado_tecnico_por UUID REFERENCES public.profiles(id),
    aprovado_tecnico_em TIMESTAMP WITH TIME ZONE,
    aprovado_gestor_por UUID REFERENCES public.profiles(id),
    aprovado_gestor_em TIMESTAMP WITH TIME ZONE,
    rejeitado_por UUID REFERENCES public.profiles(id),
    rejeitado_em TIMESTAMP WITH TIME ZONE,
    motivo_rejeicao TEXT,
    executado_por UUID REFERENCES public.profiles(id),
    executado_em TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.itens_baixa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baixa_id UUID REFERENCES public.baixas(id) ON DELETE CASCADE,
    item_inventario_id UUID REFERENCES public.itens_inventario(id),
    quantidade INTEGER NOT NULL,
    motivo TEXT, -- QUEBRA, PERDA, VENCIMENTO, OBSOLESCENCIA, OUTROS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_setor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_solicitacao_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_baixa ENABLE ROW LEVEL SECURITY;

-- Create Policies (Simplified for now: Admins/Managers can do everything, users can view)
CREATE POLICY "Public Read" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.fornecedores FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.itens_inventario FOR SELECT USING (true);

-- Admin policies
CREATE POLICY "Admin All" ON public.categorias FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND regra = 'ADMIN')
);
CREATE POLICY "Admin All" ON public.fornecedores FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND regra = 'ADMIN')
);
CREATE POLICY "Admin All" ON public.itens_inventario FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND regra = 'ADMIN')
);
CREATE POLICY "Admin All" ON public.movimentacoes_estoque FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND regra = 'ADMIN')
);
CREATE POLICY "Admin All" ON public.estoque_setor FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND regra = 'ADMIN')
);
CREATE POLICY "Admin All" ON public.solicitacoes_compra FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND regra = 'ADMIN')
);
CREATE POLICY "Admin All" ON public.itens_solicitacao_compra FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND regra = 'ADMIN')
);
CREATE POLICY "Admin All" ON public.baixas FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND regra = 'ADMIN')
);
CREATE POLICY "Admin All" ON public.itens_baixa FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND regra = 'ADMIN')
);
