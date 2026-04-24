-- Update profiles RLS policies
DROP POLICY IF EXISTS "view own profile" ON public.profiles;
DROP POLICY IF EXISTS "view profiles" ON public.profiles;

CREATE POLICY "view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = id) OR -- Can see yourself
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = true)) OR -- Masters can see everyone
  (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()) 
    AND is_master = false -- Non-masters can see people in same org who are NOT masters
  )
);

DROP POLICY IF EXISTS "update own profile" ON public.profiles;
DROP POLICY IF EXISTS "update profiles" ON public.profiles;

CREATE POLICY "update profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  (auth.uid() = id) OR 
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = true))
)
WITH CHECK (
  (
    (auth.uid() = id AND is_master = (SELECT p.is_master FROM public.profiles p WHERE p.id = auth.uid())) -- Non-masters can't change their own is_master
    OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = true)) -- Masters can change anything
  )
);

DROP POLICY IF EXISTS "insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "insert profiles" ON public.profiles;

CREATE POLICY "insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  (auth.uid() = id AND is_master = false) OR -- Can self-register as non-master
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_master = true)) -- Masters can create anyone
);

-- Trigger to clear fields for master users
CREATE OR REPLACE FUNCTION public.clean_master_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_master THEN
    NEW.organization_id := NULL;
    NEW.department_id := NULL;
    NEW.position_id := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_clean_master_profile ON public.profiles;
CREATE TRIGGER tr_clean_master_profile
BEFORE INSERT OR UPDATE OF is_master, organization_id, department_id, position_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.clean_master_profile();

-- Seed initial departments for the first organization
DO $$
DECLARE
  org_id UUID;
  ti_id UUID;
  com_id UUID;
  fin_id UUID;
  sup_id UUID;
BEGIN
  SELECT id INTO org_id FROM public.organizations ORDER BY created_at LIMIT 1;
  
  IF org_id IS NOT NULL THEN
    -- TI
    INSERT INTO public.departments (name, organization_id) VALUES ('TI', org_id) RETURNING id INTO ti_id;
    -- Comercial
    INSERT INTO public.departments (name, organization_id) VALUES ('Comercial', org_id) RETURNING id INTO com_id;
    -- Financeiro
    INSERT INTO public.departments (name, organization_id) VALUES ('Financeiro', org_id) RETURNING id INTO fin_id;
    -- Suporte
    INSERT INTO public.departments (name, organization_id) VALUES ('Suporte', org_id) RETURNING id INTO sup_id;

    -- Add default permissions for Support department (TI/Suporte)
    INSERT INTO public.department_permissions (department_id, module_name, can_view, can_create, can_edit, can_delete)
    VALUES 
      (sup_id, 'tickets', true, true, true, false),
      (sup_id, 'users', true, false, false, false),
      (ti_id, 'tickets', true, true, true, true),
      (ti_id, 'users', true, true, true, false),
      (ti_id, 'departments', true, true, true, false);
  END IF;
END $$;