import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Loader2 } from "lucide-react";
import {
  getPasswordPolicy,
  validatePassword,
  describePolicy,
  type PasswordPolicy,
} from "@/lib/passwordPolicy";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  forced?: boolean; // se true, não pode fechar
  onSuccess?: () => void;
}

export default function ChangePasswordDialog({ open, onOpenChange, forced, onSuccess }: Props) {
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      getPasswordPolicy().then(setPolicy);
      setPwd("");
      setConfirm("");
    }
  }, [open]);

  const validation = policy ? validatePassword(pwd, policy) : { valid: false, errors: [] };
  const matches = pwd.length > 0 && pwd === confirm;

  const handleSave = async () => {
    if (!validation.valid) {
      toast({ variant: "destructive", title: "Senha inválida", description: validation.errors.join(", ") });
      return;
    }
    if (!matches) {
      toast({ variant: "destructive", title: "Erro", description: "As senhas não coincidem" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("change-password-secure", {
        body: { newPassword: pwd }
      });

      if (error) {
        // Handle cases where error is wrapped or is an object
        const msg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        throw new Error(msg);
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }

      toast({ title: "Senha atualizada", description: "Sua senha foi alterada com sucesso." });
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na alteração", description: e.message || "Erro ao atualizar senha." });
    } finally {
      setLoading(false);
    }
  };

  const rules = policy ? describePolicy(policy) : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (forced && !v) return; // bloqueia fechar
        onOpenChange(v);
      }}
    >
      <DialogContent onInteractOutside={(e) => forced && e.preventDefault()} onEscapeKeyDown={(e) => forced && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{forced ? "Defina uma nova senha" : "Alterar senha"}</DialogTitle>
          {forced && (
            <DialogDescription>
              Por segurança, você precisa definir uma nova senha antes de continuar.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-pwd">Nova senha</Label>
            <PasswordInput id="new-pwd" value={pwd} onChange={(e) => setPwd(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pwd">Confirmar nova senha</Label>
            <PasswordInput id="confirm-pwd" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>

          <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/30">
            <p className="font-medium mb-1">Requisitos da senha:</p>
            <div className="flex items-center gap-2">
              <Check size={14} className="text-primary" />
              <span className="text-foreground">Diferente da atual e anteriores</span>
            </div>
            {rules.map((r, i) => {
              const ok = pwd.length > 0 && !validation.errors.some((e) => e.toLowerCase().includes(r.toLowerCase().split(" ")[0]) || (r.startsWith("Mínimo") && e.startsWith("Mínimo")));
              return (
                <div key={i} className="flex items-center gap-2">
                  {ok ? <Check size={14} className="text-primary" /> : <X size={14} className="text-muted-foreground" />}
                  <span className={ok ? "text-foreground" : "text-muted-foreground"}>{r}</span>
                </div>
              );
            })}
            {confirm.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                {matches ? <Check size={14} className="text-primary" /> : <X size={14} className="text-destructive" />}
                <span className={matches ? "text-foreground" : "text-destructive"}>As senhas coincidem</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          {!forced && (
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
          )}
          <Button onClick={handleSave} disabled={loading || !validation.valid || !matches}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}