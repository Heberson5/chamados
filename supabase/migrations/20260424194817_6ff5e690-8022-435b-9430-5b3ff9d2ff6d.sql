-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for the bucket
-- Allow anyone to view (since bucket is public)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'ticket-attachments');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'ticket-attachments' AND auth.role() = 'authenticated');

-- Allow users to delete their own uploads (optional, but good practice)
CREATE POLICY "Users can delete their own attachments" ON storage.objects FOR DELETE
USING (bucket_id = 'ticket-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add attachment_urls to tickets table
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}';
