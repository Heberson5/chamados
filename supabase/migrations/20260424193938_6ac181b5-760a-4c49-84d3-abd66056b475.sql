-- Alter status column to text
ALTER TABLE public.tickets ALTER COLUMN status TYPE TEXT;

-- We don't necessarily need to drop the enum, but we can't easily if other tables use it.
-- For now, just changing the column type is enough.
