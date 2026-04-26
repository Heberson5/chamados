-- Create or replace function to check if user is master (robust version)
CREATE OR REPLACE FUNCTION public.check_is_master()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_master = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant ALL access to Master users on organizations
DROP POLICY IF EXISTS "Master users can view all organizations" ON public.organizations;
CREATE POLICY "Master users can manage all organizations" 
ON public.organizations FOR ALL 
USING (public.check_is_master());

-- Grant ALL access to Master users on profiles
DROP POLICY IF EXISTS "profiles_master_access" ON public.profiles;
CREATE POLICY "profiles_master_access" 
ON public.profiles FOR ALL 
USING (public.check_is_master());

-- Grant ALL access to Master users on user_roles
DROP POLICY IF EXISTS "Master users can view all user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Master users can manage all user_roles" ON public.user_roles;
CREATE POLICY "Master users can manage all user_roles" 
ON public.user_roles FOR ALL 
USING (public.check_is_master());

-- Grant ALL access to Master users on ticket_comments
DROP POLICY IF EXISTS "Master users can manage all ticket_comments" ON public.ticket_comments;
CREATE POLICY "Master users can manage all ticket_comments" 
ON public.ticket_comments FOR ALL 
USING (public.check_is_master());

-- Grant ALL access to Master users on audit_logs
DROP POLICY IF EXISTS "Master users can view all audit_logs" ON public.audit_logs;
CREATE POLICY "Master users can manage all audit_logs" 
ON public.audit_logs FOR ALL 
USING (public.check_is_master());

-- Grant ALL access to Master users on notifications
DROP POLICY IF EXISTS "Master users can view all notifications" ON public.notifications;
CREATE POLICY "Master users can manage all notifications" 
ON public.notifications FOR ALL 
USING (public.check_is_master());

-- Grant ALL access to Master users on kanban_settings
DROP POLICY IF EXISTS "Master users can manage all kanban_settings" ON public.kanban_settings;
CREATE POLICY "Master users can manage all kanban_settings" 
ON public.kanban_settings FOR ALL 
USING (public.check_is_master());

-- Grant ALL access to Master users on system_settings
DROP POLICY IF EXISTS "Master users can update system settings" ON public.system_settings;
CREATE POLICY "Master users can manage all system_settings" 
ON public.system_settings FOR ALL 
USING (public.check_is_master());

-- Grant ALL access to Master users on departments (ensure)
DROP POLICY IF EXISTS "Master users can do everything on departments" ON public.departments;
DROP POLICY IF EXISTS "Master users can manage departments" ON public.departments;
CREATE POLICY "Master users can manage all departments" 
ON public.departments FOR ALL 
USING (public.check_is_master());

-- Grant ALL access to Master users on positions (ensure)
DROP POLICY IF EXISTS "Master users can do everything on positions" ON public.positions;
DROP POLICY IF EXISTS "Master users can manage positions" ON public.positions;
CREATE POLICY "Master users can manage all positions" 
ON public.positions FOR ALL 
USING (public.check_is_master());

-- Grant ALL access to Master users on department_permissions (ensure)
DROP POLICY IF EXISTS "Master users can manage department_permissions" ON public.department_permissions;
CREATE POLICY "Master users can manage all department_permissions" 
ON public.department_permissions FOR ALL 
USING (public.check_is_master());
