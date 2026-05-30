-- Allow technicians and admins to record transfers
GRANT INSERT, SELECT ON public.transferencias_chamado TO authenticated;
GRANT ALL ON public.transferencias_chamado TO service_role;

DROP POLICY IF EXISTS "Tecnicos and Admins can insert transfers" ON public.transferencias_chamado;
CREATE POLICY "Tecnicos and Admins can insert transfers"
ON public.transferencias_chamado
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_tecnico() OR public.is_admin()
);

-- Index for reporting
CREATE INDEX IF NOT EXISTS idx_transferencias_chamado_chamado ON public.transferencias_chamado(chamado_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_chamado_tec_ant ON public.transferencias_chamado(tecnico_anterior_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_chamado_tec_novo ON public.transferencias_chamado(tecnico_novo_id);