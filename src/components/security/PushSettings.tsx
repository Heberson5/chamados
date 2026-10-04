import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { BellRing } from "lucide-react";
import { VAPID_PUBLIC_KEY, disablePush, enablePush, getCurrentSubscription, isPushSupported } from "@/lib/push";

/** Liga/desliga notificações push neste dispositivo. */
export default function PushSettings({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const available = isPushSupported() && !!VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!available) return;
    getCurrentSubscription().then((s) => setEnabled(!!s)).catch(() => undefined);
  }, [available]);

  const toggle = async (value: boolean) => {
    setBusy(true);
    try {
      if (value) await enablePush(userId);
      else await disablePush();
      setEnabled(value);
      toast({ title: value ? "Notificações ativadas neste dispositivo" : "Notificações desativadas neste dispositivo" });
    } catch (err) {
      toast({ variant: "destructive", title: "Não foi possível alterar", description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-primary">
          <BellRing size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold">Notificações neste dispositivo</p>
          <p className="text-sm text-muted-foreground">
            {available
              ? "Avisos de novo chamado atribuído, respostas e SLA, mesmo com o app fechado."
              : "Indisponível: instale o app e peça ao administrador para configurar as notificações push."}
          </p>
        </div>
      </div>
      <Switch checked={enabled} disabled={!available || busy} onCheckedChange={toggle} />
    </div>
  );
}
