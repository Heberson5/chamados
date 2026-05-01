-- Create password history table
CREATE TABLE IF NOT EXISTS public.password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- Policies for password history
CREATE POLICY "Users can view their own password history"
ON public.password_history FOR SELECT
USING (auth.uid() = user_id);

-- Only service role or custom functions should insert/delete
CREATE POLICY "System can manage password history"
ON public.password_history FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure profiles has necessary columns (already checked, but being safe)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'must_change_password') THEN
        ALTER TABLE public.profiles ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'password_changed_at') THEN
        ALTER TABLE public.profiles ADD COLUMN password_changed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
