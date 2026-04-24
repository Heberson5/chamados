import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Inbox, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { NewTicketDialog } from "@/components/NewTicketDialog";
import { Link } from "react-router-dom";
import { PRIORITY_DOT, PRIORITY_LABEL, timeAgo } from "@/lib/ticket-meta";
import { useKanbanSettings } from "@/hooks/useKanbanSettings";
import { cn } from "@/lib/utils";

type T = {
  id: string; number: number; subject: string; status: string;
  priority: string; created_at: string;
};

const Dashboard = () => {
  const { getStatusLabel, getStatusColor } = useKanbanSettings();
  const { org, profile } = useAuth();
  const [tickets, setTickets] = useState<T[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    let query = supabase
      .from("tickets")
      .select("id,number,subject,status,priority,created_at");
    
    if (org) {
      query = query.eq("organization_id", org.id);
    } else if (!profile?.is_master) {
      setTickets([]);
      return;
    }

    const { data } = await query
      .order("created_at", { ascending: false })
      .limit(50);
    setTickets((data as T[]) ?? []);
  };

  useEffect(() => { 
    load(); 
  }, [org]);

  const counts = {
    open: tickets.filter((t) => t.status === "open").length,
    progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    urgent: tickets.filter((t) => t.priority === "urgent" && t.status !== "closed").length,
  };

  const stats = [
    { label: "Abertos", value: counts.open, icon: Inbox, tone: "text-status-open" },
    { label: "Em andamento", value: counts.progress, icon: Clock, tone: "text-status-progress" },
    { label: "Resolvidos", value: counts.resolved, icon: CheckCircle2, tone: "text-status-resolved" },
    { label: "Urgentes", value: counts.urgent, icon: AlertTriangle, tone: "text-priority-urgent" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Olá, ${profile?.full_name ?? "bem-vindo"} 👋`}
        actions={
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="size-4" /> Novo chamado
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <s.icon className={`size-4 ${s.tone}`} />
              </div>
              <div className="text-3xl font-semibold tracking-tight mt-2">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-background overflow-hidden">
          <div className="px-4 h-11 border-b border-border flex items-center justify-between">
            <div className="text-sm font-medium">Chamados recentes</div>
            <Link to="/app/tickets" className="text-xs text-muted-foreground hover:text-foreground">Ver todos →</Link>
          </div>
          {tickets.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Nenhum chamado ainda. Crie o primeiro para começar.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {tickets.slice(0, 8).map((t) => (
                <li key={t.id}>
                  <Link to={`/app/tickets/${t.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-1">
                    <span className="text-xs text-muted-foreground tabular-nums w-12">#{t.number}</span>
                     <span className="flex items-center gap-1.5 text-xs w-32 shrink-0">
                       <span className={cn("size-1.5 rounded-full", getStatusColor(t.status))} />
                       {getStatusLabel(t.status)}
                     </span>
                    <span className="flex-1 text-sm font-medium truncate">{t.subject}</span>
                    <span className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={`size-1.5 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                      {PRIORITY_LABEL[t.priority]}
                    </span>
                    <span className="text-xs text-muted-foreground w-12 text-right">{timeAgo(t.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <NewTicketDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </>
  );
};

export default Dashboard;
