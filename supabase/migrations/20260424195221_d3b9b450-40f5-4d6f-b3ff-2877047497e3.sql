-- Attach audit triggers to main tables
CREATE TRIGGER audit_tickets_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_departments_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_companies_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_profiles_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Function to log login/logout actions
CREATE OR REPLACE FUNCTION public.log_user_action(p_action TEXT)
RETURNS VOID AS $$
DECLARE
    current_user_id UUID := auth.uid();
    current_user_email TEXT;
BEGIN
    SELECT email INTO current_user_email FROM public.profiles WHERE id = current_user_id;
    
    INSERT INTO public.audit_logs (user_id, user_email, action, timestamp)
    VALUES (current_user_id, current_user_email, p_action, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
