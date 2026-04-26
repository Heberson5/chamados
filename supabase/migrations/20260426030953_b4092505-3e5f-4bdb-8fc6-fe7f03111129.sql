-- Add titulo and anexos columns to chamados
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS titulo TEXT;
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS anexos TEXT[];

-- Create storage bucket for chamados attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chamados_anexos', 'chamados_anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chamados_anexos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Chamados Anexos Public Access') THEN
        CREATE POLICY "Chamados Anexos Public Access" 
        ON storage.objects FOR SELECT 
        USING (bucket_id = 'chamados_anexos');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload chamados attachments') THEN
        CREATE POLICY "Authenticated users can upload chamados attachments" 
        ON storage.objects FOR INSERT 
        WITH CHECK (bucket_id = 'chamados_anexos' AND auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own chamados attachments') THEN
        CREATE POLICY "Users can update their own chamados attachments" 
        ON storage.objects FOR UPDATE 
        USING (bucket_id = 'chamados_anexos' AND auth.uid() = owner);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own chamados attachments') THEN
        CREATE POLICY "Users can delete their own chamados attachments" 
        ON storage.objects FOR DELETE 
        USING (bucket_id = 'chamados_anexos' AND auth.uid() = owner);
    END IF;
END $$;