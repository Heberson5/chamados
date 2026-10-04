import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, ShieldAlert } from "lucide-react";
import MfaSettings from "./MfaSettings";

type PrivacyNotice = { texto?: string; versao?: string; atualizado_em?: string; encarregado_nome?: string; encarregado_email?: string };

/*
 * Barreiras exibidas logo após o login, dentro do app:
 *  1. Sessão sem a 2ª etapa para quem tem 2FA cadastrado -> volta ao login.
 *  2. Admin/Master sem 2FA quando a empresa exige -> precisa configurar.
 *  3. Aviso de privacidade numa versão ainda não lida -> registrar ciência.
 */
export default function SecurityGate() {
  const navigate = useNavigate();
  const { isAdmin, loading: permsLoading } = usePermissions();
  const [needMfaSetup, setNeedMfaSetup] = useState(false);
  const [notice, setNotice] = useState<PrivacyNotice | null>(null);
  const [saving, setSaving] = useState(false);

  const check = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      await supabase.auth.signOut();
      navigate("/login");
      return;
    }

    const [{ data: lgpd }, { data: privacy }] = await Promise.all([
      supabase.from("system_settings").select("value").eq("key", "lgpd_settings").maybeSingle(),
      supabase.from("system_settings").select("value").eq("key", "privacy_notice").maybeSingle(),
    ]);

    const exigir = !!(lgpd?.value as { exigir_mfa_admin?: boolean } | null)?.exigir_mfa_admin;
    if (exigir && isAdmin && aal?.currentLevel !== "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      setNeedMfaSetup(!(factors?.totp ?? []).some((f) => f.status === "verified"));
    } else {
      setNeedMfaSetup(false);
    }

    const pn = privacy?.value as PrivacyNotice | null;
    if (pn?.versao && pn.texto) {
      const { data: aceite } = await supabase
        .from("lgpd_aceites")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("versao", String(pn.versao))
        .maybeSingle();
      setNotice(aceite ? null : pn);
    } else {
      setNotice(null);
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (!permsLoading) check();
  }, [permsLoading, check]);

  const accept = async () => {
    if (!notice?.versao) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("lgpd_aceites").insert({
        user_id: user.id,
        versao: String(notice.versao),
        user_agent: navigator.userAgent.slice(0, 250),
      });
    }
    setSaving(false);
    setNotice(null);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (needMfaSetup) {
    return (
      <Dialog open>
        <DialogContent className="sm:max-w-[560px] [&>button]:hidden" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" /> Configure a verificação em duas etapas
            </DialogTitle>
            <DialogDescription>
              A empresa exige verificação em duas etapas para administradores. Configure agora para continuar usando o sistema.
            </DialogDescription>
          </DialogHeader>
          <MfaSettings compact onEnrolled={() => setNeedMfaSetup(false)} />
          <DialogFooter>
            <Button variant="ghost" onClick={logout}>
              <LogOut size={16} /> Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (notice) {
    return (
      <Dialog open>
        <DialogContent className="sm:max-w-[600px] [&>button]:hidden" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Aviso de privacidade</DialogTitle>
            <DialogDescription>
              Antes de continuar, leia como seus dados pessoais são tratados neste sistema (versão {notice.versao}).
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">
            {notice.texto}
            {(notice.encarregado_nome || notice.encarregado_email) && (
              <p className="mt-4 text-xs text-muted-foreground">
                Encarregado de dados (DPO): {notice.encarregado_nome} {notice.encarregado_email && `· ${notice.encarregado_email}`}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={logout}>
              <LogOut size={16} /> Sair
            </Button>
            <Button onClick={accept} disabled={saving} autoFocus>
              {saving && <Loader2 size={16} className="animate-spin" />} Li e estou ciente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
