import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Copy, KeyRound, Loader2, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";

type Factor = { id: string; friendly_name?: string | null; status: string; created_at: string };

/**
 * Verificação em duas etapas (TOTP — Google Authenticator, Microsoft
 * Authenticator, Authy, 1Password...). Usa o MFA nativo do Supabase Auth.
 */
export default function MfaSettings({ onEnrolled, compact }: { onEnrolled?: () => void; compact?: boolean }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [confirmDisable, setConfirmDisable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error) setFactors(((data?.all ?? []) as Factor[]).filter((f) => f.status === "verified"));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEnroll = async () => {
    setBusy(true);
    try {
      // Remove tentativas anteriores não concluídas.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of (list?.all ?? []) as Factor[]) {
        if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `App autenticador ${new Date().toLocaleDateString("pt-BR")}`,
      });
      if (error) throw error;
      setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      setCode("");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Não foi possível iniciar a configuração",
        description: (err as Error).message.includes("disabled")
          ? "A verificação em duas etapas não está habilitada no servidor (Supabase > Authentication > MFA)."
          : (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async () => {
    if (!enrolling) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolling.id, code: code.trim() });
      if (error) throw error;
      setEnrolling(null);
      toast({ title: "Verificação em duas etapas ativada", description: "A partir de agora o login pedirá o código do aplicativo." });
      supabase.rpc("registrar_auditoria", { _acao: "MFA_ATIVADO" }).then(() => undefined, () => undefined);
      await load();
      onEnrolled?.();
    } catch {
      toast({ variant: "destructive", title: "Código inválido", description: "Confira o código de 6 dígitos no aplicativo e tente de novo." });
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    const factor = factors[0];
    if (!factor) return;
    setBusy(true);
    try {
      // Desativar exige provar posse do fator (sessão aal2).
      const { error: vErr } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: disableCode.trim() });
      if (vErr) throw new Error("Código inválido.");
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw error;
      toast({ title: "Verificação em duas etapas desativada" });
      supabase.rpc("registrar_auditoria", { _acao: "MFA_DESATIVADO" }).then(() => undefined, () => undefined);
      setConfirmDisable(false);
      setDisableCode("");
      await load();
    } catch (err) {
      toast({ variant: "destructive", title: "Não foi possível desativar", description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Carregando…
      </div>
    );
  }

  if (enrolling) {
    return (
      <div className="space-y-4">
        <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal pl-5">
          <li>Abra um aplicativo autenticador no celular (Google Authenticator, Microsoft Authenticator, Authy…).</li>
          <li>Escaneie o QR code abaixo (ou digite a chave manualmente).</li>
          <li>Informe o código de 6 dígitos que aparecer no aplicativo.</li>
        </ol>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <img src={enrolling.qr} alt="QR code para o aplicativo autenticador" className="h-44 w-44 rounded-lg border bg-white p-2" />
          <div className="space-y-3 min-w-0 flex-1">
            <div>
              <Label className="text-xs text-muted-foreground">Chave para digitar manualmente</Label>
              <div className="mt-1 flex items-center gap-2">
                <code className="rounded-md bg-muted px-2 py-1 text-xs font-mono break-all">{enrolling.secret}</code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => navigator.clipboard?.writeText(enrolling.secret)}
                  title="Copiar"
                >
                  <Copy size={14} />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mfa-code">Código de 6 dígitos</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                className="w-40 font-mono tracking-[0.3em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && code.length === 6 && confirmEnroll()}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={confirmEnroll} disabled={busy || code.length !== 6}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Ativar
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEnrolling(null)} disabled={busy}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (factors.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Ativada</p>
            <p className="text-xs text-muted-foreground">
              {factors[0].friendly_name || "Aplicativo autenticador"} · desde {new Date(factors[0].created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
        {!compact &&
          (confirmDisable ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="mfa-disable">Código atual do aplicativo</Label>
                <Input
                  id="mfa-disable"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-40 font-mono tracking-[0.3em]"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <Button variant="destructive" onClick={disable} disabled={busy || disableCode.length !== 6}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldOff size={16} />} Desativar
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDisable(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConfirmDisable(true)}>
              <ShieldOff size={14} /> Desativar verificação em duas etapas
            </Button>
          ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-primary">
          <Smartphone size={18} />
        </span>
        <p className="text-sm text-muted-foreground">
          Além da senha, o login pedirá um código gerado no seu celular. Protege sua conta mesmo se a senha vazar.
        </p>
      </div>
      <Button onClick={startEnroll} disabled={busy} className="shrink-0">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Configurar
      </Button>
    </div>
  );
}
