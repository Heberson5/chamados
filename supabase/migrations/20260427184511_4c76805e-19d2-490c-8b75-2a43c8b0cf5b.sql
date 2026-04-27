-- Fix log_user_action function
CREATE OR REPLACE FUNCTION public.log_user_action(p_action text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    current_user_id UUID := auth.uid();
    current_user_email TEXT;
BEGIN
    -- Only log if there is an authenticated user
    IF current_user_id IS NOT NULL THEN
        SELECT email INTO current_user_email FROM public.profiles WHERE id = current_user_id;
        
        INSERT INTO public.audit_logs (user_id, user_email, action, created_at)
        VALUES (current_user_id, current_user_email, p_action, now());
    END IF;
END;
$function$;

-- Add audit triggers to other tables
-- Chamados
DROP TRIGGER IF EXISTS audit_chamados_trigger ON public.chamados;
CREATE TRIGGER audit_chamados_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Categorias
DROP TRIGGER IF EXISTS audit_categorias_trigger ON public.categorias;
CREATE TRIGGER audit_categorias_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.categorias
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Servicos
DROP TRIGGER IF EXISTS audit_servicos_trigger ON public.servicos;
CREATE TRIGGER audit_servicos_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.servicos
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Reembolsos
DROP TRIGGER IF EXISTS audit_reembolsos_trigger ON public.reembolsos;
CREATE TRIGGER audit_reembolsos_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reembolsos
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Expedientes
DROP TRIGGER IF EXISTS audit_expedientes_trigger ON public.expedientes;
CREATE TRIGGER audit_expedientes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.expedientes
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Solicitacoes de Compra
DROP TRIGGER IF EXISTS audit_solicitacoes_compra_trigger ON public.solicitacoes_compra;
CREATE TRIGGER audit_solicitacoes_compra_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.solicitacoes_compra
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Fornecedores
DROP TRIGGER IF EXISTS audit_fornecedores_trigger ON public.fornecedores;
CREATE TRIGGER audit_fornecedores_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.fornecedores
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Role Definitions
DROP TRIGGER IF EXISTS audit_role_definitions_trigger ON public.role_definitions;
CREATE TRIGGER audit_role_definitions_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.role_definitions
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- User Roles
DROP TRIGGER IF EXISTS audit_user_roles_trigger ON public.user_roles;
CREATE TRIGGER audit_user_roles_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
