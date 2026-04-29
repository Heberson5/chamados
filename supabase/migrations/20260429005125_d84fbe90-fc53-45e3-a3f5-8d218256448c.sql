-- Add sequential ID to audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS sequencial_id BIGINT GENERATED ALWAYS AS IDENTITY;

-- Add sequential ID to chamados
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS sequencial_id BIGINT GENERATED ALWAYS AS IDENTITY;

-- Add sequential ID to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sequencial_id BIGINT GENERATED ALWAYS AS IDENTITY;

-- Add sequential ID to departamentos
ALTER TABLE public.departamentos ADD COLUMN IF NOT EXISTS sequencial_id BIGINT GENERATED ALWAYS AS IDENTITY;
