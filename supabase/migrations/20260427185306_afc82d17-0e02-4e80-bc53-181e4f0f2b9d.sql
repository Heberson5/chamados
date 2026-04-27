CREATE OR REPLACE FUNCTION public.set_session_user_id(user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::text, true);
END;
$function$;
