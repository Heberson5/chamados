UPDATE public.role_definitions
SET permissions = (
  SELECT to_jsonb(array_agg(DISTINCT p))
  FROM (
    SELECT jsonb_array_elements_text(permissions) AS p
    UNION ALL SELECT 'acompanhamento'
  ) s
)
WHERE name ILIKE 'Administrador' OR name ILIKE 'Master';