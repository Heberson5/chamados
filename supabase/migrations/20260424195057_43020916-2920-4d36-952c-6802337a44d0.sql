-- Create a table for module permissions (e.g., users, departments, etc.)
CREATE TABLE IF NOT EXISTS public.department_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    module_name TEXT NOT NULL, -- e.g., 'users', 'departments', 'companies'
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(department_id, module_name)
);

-- Enable RLS for department_permissions
ALTER TABLE public.department_permissions ENABLE ROW LEVEL SECURITY;

-- Simple policy for admins to view and manage (assuming is_master in profiles table for admin)
CREATE POLICY "Admins can manage department permissions"
ON public.department_permissions
FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.is_master = true
));

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_email TEXT,
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.is_master = true
));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_department_permissions_updated_at
BEFORE UPDATE ON public.department_permissions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add a generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID := auth.uid();
    current_user_email TEXT;
BEGIN
    -- We'll try to get email from profiles instead since auth.users isn't directly accessible in triggers sometimes without more setup
    SELECT email INTO current_user_email FROM public.profiles WHERE id = current_user_id;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, new_data)
        VALUES (current_user_id, current_user_email, 'CREATE', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, old_data, new_data)
        VALUES (current_user_id, current_user_email, 'UPDATE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action, table_name, record_id, old_data)
        VALUES (current_user_id, current_user_email, 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: We can add triggers to specific tables later. For now let's focus on the structure.
