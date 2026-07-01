
-- fornecedores: exigir autenticação
DROP POLICY IF EXISTS "Public Read" ON public.fornecedores;
CREATE POLICY "Authenticated read fornecedores" ON public.fornecedores
  FOR SELECT TO authenticated USING (true);

-- profiles: alinhar policy self com user_id (mesma coluna usada por is_admin())
DROP POLICY IF EXISTS profiles_self_all ON public.profiles;
CREATE POLICY profiles_self_all ON public.profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

-- chamados: restringir técnicos ao próprio escopo
DROP POLICY IF EXISTS "Technician access chamados" ON public.chamados;
CREATE POLICY "Technician access chamados" ON public.chamados
  FOR SELECT TO authenticated
  USING (
    is_tecnico() AND (
      tecnico_id = auth.uid()
      OR usuario_id = auth.uid()
      OR department_id IN (
        SELECT p.department_id FROM public.profiles p
        WHERE (p.user_id = auth.uid() OR p.id = auth.uid()) AND p.department_id IS NOT NULL
      )
      OR department_id IN (
        SELECT unnest(p.admin_departments) FROM public.profiles p
        WHERE (p.user_id = auth.uid() OR p.id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Technician update chamados" ON public.chamados;
CREATE POLICY "Technician update chamados" ON public.chamados
  FOR UPDATE TO authenticated
  USING (
    is_tecnico() AND (
      tecnico_id = auth.uid()
      OR department_id IN (
        SELECT p.department_id FROM public.profiles p
        WHERE (p.user_id = auth.uid() OR p.id = auth.uid()) AND p.department_id IS NOT NULL
      )
      OR department_id IN (
        SELECT unnest(p.admin_departments) FROM public.profiles p
        WHERE (p.user_id = auth.uid() OR p.id = auth.uid())
      )
    )
  );

-- user_roles: remover bootstrap perigoso
DROP POLICY IF EXISTS "insert role self bootstrap" ON public.user_roles;
