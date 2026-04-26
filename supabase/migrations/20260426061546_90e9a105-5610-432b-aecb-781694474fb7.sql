-- Add cidade, must_change_password and password_changed_at to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamp with time zone DEFAULT now();

-- Insert default password policy if it doesn't exist
INSERT INTO public.system_settings (key, value)
VALUES (
  'password_policy',
  jsonb_build_object(
    'min_length', 8,
    'require_uppercase', true,
    'require_lowercase', true,
    'require_number', true,
    'require_special', true,
    'expiration_days', 0,
    'force_change_on_first_login', true
  )
)
ON CONFLICT (key) DO NOTHING;