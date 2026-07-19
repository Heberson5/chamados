-- Corrige a leitura pública (antes do login) de layout_settings/
-- landing_page_settings em system_settings.
--
-- A política "Public branding settings readable by anon" (migração
-- 20260619194453) permite ao anon ler essas duas chaves, mas a tabela
-- também tem políticas FOR ALL sem restrição de role (ex.: "Master users
-- can manage all system_settings" usando check_is_master(), e a política
-- de admins) — o Postgres avalia TODAS as políticas aplicáveis ao SELECT
-- para o papel atual, então o anon acaba tentando chamar check_is_master()/
-- is_admin(), cujo EXECUTE foi revogado do anon numa migração de
-- endurecimento de segurança posterior (20260701234730). Isso derruba a
-- consulta inteira com "permission denied for function is_admin" em vez
-- de simplesmente filtrar linhas — quebrando a Landing Page pública.
--
-- Ambas as funções são SECURITY DEFINER só-leitura que resolvem para
-- false quando auth.uid() é nulo (caso do anon), então não há risco em
-- devolver o EXECUTE a esse papel especificamente.

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.check_is_master() TO anon;
