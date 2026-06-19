import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle } from "lucide-react";
import { evaluateSchedule, loadEffectiveSchedule, type AccessSchedule } from "@/lib/accessSchedule";

function notifyBrowser(title: string, body: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(p => { if (p === "granted") new Notification(title, { body }); });
  }
}

export default function AccessGuard() {
  const [schedule, setSchedule] = useState<AccessSchedule | null>(null);
  const [warnings, setWarnings] = useState({ pre_minutes: 30, final_minutes: 5, browser_notify: true });
  const [now, setNow] = useState(new Date());
  const [popup, setPopup] = useState<null | { type: "pre" | "final"; minutes: number }>(null);
  const [showBar, setShowBar] = useState(false);
  const shownPre = useRef(false);
  const shownFinal = useRef(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const sched = await loadEffectiveSchedule(user.id);
      setSchedule(sched);
      const { data: w } = await supabase.from("system_settings").select("value").eq("key", "access_warnings").maybeSingle();
      if (w?.value) setWarnings({ ...warnings, ...(w.value as any) });
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    })();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const status = evaluateSchedule(schedule, now);

  useEffect(() => {
    if (!status.hasSchedule) return;
    if (!status.allowed) {
      toast({ variant: "destructive", title: "Acesso fora do horário", description: "Você foi desconectado." });
      supabase.auth.signOut().then(() => navigate("/login"));
      return;
    }
    const rem = status.endMinutesFromNow!;
    if (rem <= warnings.final_minutes && !shownFinal.current) {
      shownFinal.current = true;
      setPopup({ type: "final", minutes: rem });
      if (warnings.browser_notify) notifyBrowser("Encerrando acesso", `Restam ${rem} minuto(s) para o bloqueio do acesso.`);
    } else if (rem <= warnings.pre_minutes && !shownPre.current) {
      shownPre.current = true;
      setPopup({ type: "pre", minutes: rem });
      if (warnings.browser_notify) notifyBrowser("Atenção: fim do expediente", `Restam ${rem} minutos para o bloqueio. Finalize suas tarefas para não perder informações.`);
    }
  }, [status.allowed, status.endMinutesFromNow, status.hasSchedule, warnings]);

  if (!status.hasSchedule) return null;
  const rem = status.endMinutesFromNow ?? 0;

  return (
    <>
      {showBar && rem > 0 && (
        <div className="sticky top-0 z-50 bg-orange-500 text-white px-4 py-2 text-center font-semibold flex items-center justify-center gap-2 shadow">
          <Clock size={16} />
          <span>Encerramento de acesso em {rem} minuto(s)</span>
        </div>
      )}
      <Dialog open={!!popup} onOpenChange={(o) => { if (!o) { setPopup(null); setShowBar(true); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={popup?.type === "final" ? "text-red-500" : "text-orange-500"} />
              {popup?.type === "final" ? "Atenção: 5 minutos para o bloqueio" : "Aviso de encerramento"}
            </DialogTitle>
            <DialogDescription>
              {popup?.type === "final"
                ? `Restam ${popup?.minutes} minuto(s) para o bloqueio do seu acesso. Salve suas alterações imediatamente.`
                : `Restam ${popup?.minutes} minutos para o fim do seu horário. Finalize o que está fazendo para não perder nada.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => { setPopup(null); setShowBar(true); }}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}