ALTER TABLE public.profiles
ADD CONSTRAINT profiles_department_id_fkey
FOREIGN KEY (department_id)
REFERENCES public.departamentos(id)
ON DELETE SET NULL;

-- Also add an index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles(department_id);
