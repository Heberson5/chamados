
CREATE POLICY "Public branding settings readable by anon"
ON public.system_settings
FOR SELECT
TO anon
USING (key IN ('layout_settings','landing_page_settings'));

GRANT SELECT ON public.system_settings TO anon;
