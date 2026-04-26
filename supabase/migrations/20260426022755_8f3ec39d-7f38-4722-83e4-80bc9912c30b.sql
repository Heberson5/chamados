-- Fix Search Path for the function
ALTER FUNCTION public.handle_updated_at() SET search_path = public;

-- Expedientes Policies
CREATE POLICY "Admins can manage all schedules" ON public.expedientes FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND regra = 'ADMIN'));
CREATE POLICY "Technicians view own schedules" ON public.expedientes FOR SELECT USING (usuario_id = auth.uid());

-- Servicos Policies
CREATE POLICY "Admins can manage all services" ON public.servicos FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND regra = 'ADMIN'));
CREATE POLICY "Anyone view active services" ON public.servicos FOR SELECT USING (ativo = true);

-- Ordens de Servico Policies
CREATE POLICY "Users can view own ticket services" ON public.ordens_de_servico FOR SELECT USING (EXISTS (SELECT 1 FROM public.chamados WHERE id = chamado_id AND (usuario_id = auth.uid() OR tecnico_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND regra = 'ADMIN'))));

-- Transferencias Policies
CREATE POLICY "Admins and Technicians can view transfers" ON public.transferencias_chamado FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND regra IN ('ADMIN', 'TECNICO')));

-- Comentarios Policies
CREATE POLICY "Users view comments on their tickets" ON public.comentarios_chamado FOR SELECT USING (EXISTS (SELECT 1 FROM public.chamados WHERE id = chamado_id AND (usuario_id = auth.uid() OR tecnico_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND regra = 'ADMIN'))));
CREATE POLICY "Users create comments on their tickets" ON public.comentarios_chamado FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.chamados WHERE id = chamado_id AND (usuario_id = auth.uid() OR tecnico_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND regra = 'ADMIN'))));

-- Reembolsos Policies
CREATE POLICY "Admins can manage all reimbursements" ON public.reembolsos FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND regra = 'ADMIN'));
CREATE POLICY "Users view own reimbursements" ON public.reembolsos FOR SELECT USING (solicitante_id = auth.uid());
CREATE POLICY "Users create reimbursements" ON public.reembolsos FOR INSERT WITH CHECK (solicitante_id = auth.uid());
