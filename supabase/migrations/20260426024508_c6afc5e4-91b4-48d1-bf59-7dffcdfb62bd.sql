-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_email TEXT,
    action TEXT,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Fix the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the master user
DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  default_org_id UUID;
BEGIN
  -- Get an existing organization id
  SELECT id INTO default_org_id FROM public.organizations LIMIT 1;

  -- Insert into auth.users if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'hebersohas@hotmail.com') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token,
      aud,
      role
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'hebersohas@hotmail.com',
      crypt('Guga430512', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Master Admin"}',
      now(),
      now(),
      '',
      '',
      '',
      '',
      'authenticated',
      'authenticated'
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at,
      provider_id
    ) VALUES (
      new_user_id,
      new_user_id,
      format('{"sub":"%s","email":"hebersohas@hotmail.com"}', new_user_id)::jsonb,
      'email',
      now(),
      now(),
      now(),
      new_user_id
    );

    -- Ensure profile is master with ADMIN rule
    UPDATE public.profiles 
    SET is_master = true, regra = 'ADMIN', ativo = true, nome = 'Master Admin'
    WHERE id = new_user_id;
    
    -- Add admin role if org exists
    IF default_org_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role, organization_id)
      VALUES (new_user_id, 'admin', default_org_id)
      ON CONFLICT DO NOTHING;
    END IF;

  END IF;
END $$;