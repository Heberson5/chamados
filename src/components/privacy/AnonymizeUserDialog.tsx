import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

type Target = { id: string; nome?: string | null; sobrenome?: string | null; email?: string | null } | null;

/** Anonimização de usuário (LGPD, art. 18, IV) — irreversível. */
export default function AnonymizeUserDialog({
  user,
  onOpenChange,
  onDone,
}: {
  user: Target;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [eraseContent, setEraseContent] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.rpc("lgpd_anonimizar_usuario", { _user: user.id, _apagar_conteudo: eraseContent });
    setBusy(false);
    if (error) {
      toast({ variant: "destructive", title: "Não foi possível anonimizar", description: error.message });
      return;
    }
    toast({ title: "Usuário anonimizado", description: "Nome, contato e acesso foram removidos. O histórico de chamados foi mantido sem identificação." });
    setConfirmText("");
    setEraseContent(false);
    onDone();
  };

  return (
    <AlertDialog open={!!user} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Anonimizar {user?.nome} {user?.sobrenome}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                O nome vira "Usuário removido", e-mail/telefone/foto são apagados e o acesso é bloqueado definitivamente. Os chamados continuam
                nos relatórios, sem identificar a pessoa. <strong>Não é possível desfazer.</strong>
              </p>
              <p>Use para atender um pedido de anonimização/eliminação do titular ou o desligamento de alguém.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div className="flex items-start gap-2">
            <input id="erase-content" type="checkbox" className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" checked={eraseContent} onChange={(e) => setEraseContent(e.target.checked)} />
            <Label htmlFor="erase-content" className="font-normal leading-snug">
              Apagar também o texto e os anexos dos chamados e comentários escritos por essa pessoa
            </Label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="anon-confirm" className="text-xs">
              Digite <strong>ANONIMIZAR</strong> para confirmar
            </Label>
            <Input id="anon-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={run}
            disabled={busy || confirmText.trim().toUpperCase() !== "ANONIMIZAR"}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy && <Loader2 size={16} className="animate-spin" />} Anonimizar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
