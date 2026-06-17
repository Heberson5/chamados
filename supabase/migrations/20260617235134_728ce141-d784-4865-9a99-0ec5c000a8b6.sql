UPDATE public.role_definitions
SET permissions = (
  SELECT jsonb_agg(DISTINCT val)
  FROM (
    SELECT jsonb_array_elements_text(permissions) AS val
    UNION
    SELECT unnest(ARRAY['landing_page','landing_page:visualizar','landing_page:editar'])
  ) t
)
WHERE name ILIKE 'Master';