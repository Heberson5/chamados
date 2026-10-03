import { useCallback, useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  lida: boolean | null;
  link: string | null;
  created_at: string | null;
}

export default function NotificationsBell() {
  const [items, setItems] = useState<Notificacao[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const instanceId = useId();

  const load = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("notificacoes")
      .select("id, titulo, mensagem, lida, link, created_at")
      .eq("usuario_id", uid)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as Notificacao[]) || []);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      load(user.id);
      channel = supabase
        .channel(`notificacoes-${instanceId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notificacoes", filter: `usuario_id=eq.${user.id}` },
          () => load(user.id)
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [load, instanceId]);

  const unread = items.filter((n) => !n.lida).length;

  const openItem = async (n: Notificacao) => {
    if (!n.lida) {
      setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, lida: true } : p)));
      await supabase.from("notificacoes").update({ lida: true }).eq("id", n.id);
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const markAll = async () => {
    if (!userId || unread === 0) return;
    setItems((prev) => prev.map((p) => ({ ...p, lida: true })));
    await supabase.from("notificacoes").update({ lida: true }).eq("usuario_id", userId).eq("lida", false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-[10px] font-bold text-white grid place-items-center ring-2 ring-card">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">Notificações</span>
          <button
            type="button"
            onClick={markAll}
            disabled={unread === 0}
            className="text-xs font-semibold text-primary disabled:text-muted-foreground inline-flex items-center gap-1"
          >
            <CheckCheck size={14} /> Marcar todas como lidas
          </button>
        </div>
        <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto mb-2 h-6 w-6 opacity-30" />
              Nenhuma notificação por aqui.
            </div>
          ) : (
            items.map((n) => (
              <button
                type="button"
                key={n.id}
                onClick={() => openItem(n)}
                className={cn(
                  "w-full text-left flex gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted transition-colors",
                  !n.lida && "bg-accent/50"
                )}
              >
                <span className={cn("mt-1.5 w-2 h-2 rounded-full shrink-0", n.lida ? "bg-transparent" : "bg-primary")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-snug">{n.titulo}</span>
                  <span className="block text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.mensagem}</span>
                  {n.created_at && (
                    <span className="block text-[11px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
