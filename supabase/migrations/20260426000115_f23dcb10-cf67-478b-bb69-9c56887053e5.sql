-- Master access for tickets
CREATE POLICY "Master users can view all tickets" 
ON public.tickets 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_master = true));

CREATE POLICY "Master users can manage all tickets" 
ON public.tickets 
FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_master = true));

-- Master access for user_roles
CREATE POLICY "Master users can view all user_roles" 
ON public.user_roles 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_master = true));

CREATE POLICY "Master users can manage all user_roles" 
ON public.user_roles 
FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_master = true));

-- Master access for departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view departments" ON public.departments;
CREATE POLICY "Everyone can view departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Master users can manage departments" ON public.departments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_master = true));

-- Master access for positions
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view positions" ON public.positions;
CREATE POLICY "Everyone can view positions" ON public.positions FOR SELECT USING (true);
CREATE POLICY "Master users can manage positions" ON public.positions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_master = true));

-- Master access for department_permissions
ALTER TABLE public.department_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view department_permissions" ON public.department_permissions FOR SELECT USING (true);
CREATE POLICY "Master users can manage department_permissions" ON public.department_permissions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_master = true));

-- Ensure Master users can view all profiles (to avoid recursion, we'll be careful)
-- We already have profiles_master_access, but let's make it robust
DROP POLICY IF EXISTS "profiles_master_access" ON public.profiles;
CREATE POLICY "profiles_master_access" ON public.profiles FOR SELECT USING (
  (SELECT is_master FROM profiles WHERE id = auth.uid()) = true
);
