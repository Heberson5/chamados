-- Fix search path
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Enable RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Add policy
CREATE POLICY "Only masters can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_master = true
  )
);