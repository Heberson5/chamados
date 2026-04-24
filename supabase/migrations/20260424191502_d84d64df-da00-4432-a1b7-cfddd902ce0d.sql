-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create positions table
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add columns to profiles
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'department_id') THEN
    ALTER TABLE public.profiles ADD COLUMN department_id UUID REFERENCES public.departments(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'position_id') THEN
    ALTER TABLE public.profiles ADD COLUMN position_id UUID REFERENCES public.positions(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'is_master') THEN
    ALTER TABLE public.profiles ADD COLUMN is_master BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  system_name TEXT DEFAULT 'Global System',
  logo_url TEXT,
  favicon_url TEXT,
  menu_config JSONB DEFAULT '[]'::jsonb,
  landing_page_config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default system settings if not exists
INSERT INTO public.system_settings (id, system_name)
VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'Global System')
ON CONFLICT (id) DO NOTHING;

-- Create kanban_settings table
CREATE TABLE IF NOT EXISTS public.kanban_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "Master users can do everything on departments" 
ON public.departments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_master = true));

CREATE POLICY "Users can view their company departments" 
ON public.departments FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage company departments" 
ON public.departments FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND organization_id = public.departments.organization_id AND role = 'admin'));

-- RLS Policies for positions
CREATE POLICY "Master users can do everything on positions" 
ON public.positions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_master = true));

CREATE POLICY "Users can view their company positions" 
ON public.positions FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage company positions" 
ON public.positions FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND organization_id = public.positions.organization_id AND role = 'admin'));

-- RLS Policies for system_settings
CREATE POLICY "Public can view system settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Master users can update system settings" ON public.system_settings FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_master = true));

-- RLS Policies for kanban_settings
CREATE POLICY "Users can manage their own kanban settings" ON public.kanban_settings FOR ALL USING (user_id = auth.uid());

-- Update organizations RLS to allow master access
CREATE POLICY "Master users can view all organizations" 
ON public.organizations FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_master = true));
