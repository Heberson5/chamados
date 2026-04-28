UPDATE public.role_definitions 
SET permissions = (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(permissions) AS elem
    WHERE elem::text NOT LIKE '"financeiro%"'
)
WHERE name = 'Master';
