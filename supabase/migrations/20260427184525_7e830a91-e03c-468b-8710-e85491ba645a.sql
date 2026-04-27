REVOKE EXECUTE ON FUNCTION public.log_user_action(text) FROM public;
GRANT EXECUTE ON FUNCTION public.log_user_action(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.audit_trigger_function() FROM public;
GRANT EXECUTE ON FUNCTION public.audit_trigger_function() TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_trigger_function() TO postgres;
GRANT EXECUTE ON FUNCTION public.audit_trigger_function() TO service_role;
