import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { NewTicketDialog } from "@/components/NewTicketDialog";
import { PRIORITY_DOT, PRIORITY_LABEL, timeAgo } from "@/lib/ticket-meta";
import { useKanbanSettings } from "@/hooks/useKanbanSettings";
import { cn } from "@/lib/utils";

type T = {
  id: string; number: number; subject: string; status: string;
  priority: string; created_at: string; category: string | null;
};

const Tickets = () => {
  const { getStatusLabel, getStatusColor, columns } = useKanbanSettings();
  const { org, profile } = useAuth();
  const [tickets, setTickets] = useState<T[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const load = async () => {
    let query = supabase
      .from("tickets")
      .select("id,number,subject,status,priority,created_at,category");
    
    if (org) {
      query = query.eq("organization_id", org.id);
    } else if (!profile?.is_master) {
      setTickets([]);
      return;
    }

    const { data } = await query.order("created_at", { ascending: false });
    setTickets((data as T[]) ?? []);
  };

  useEffect(() => { 
    load(); 
  }, [org]);

  const filtered = tickets
    .filter((t) => filter === "all" || t.status === filter)
    .filter((t) => !q || t.subject.toLowerCase().includes(q.toLowerCase()) || String(t.number).includes(q));

  return (
    <>
      <PageHeader
        title="Chamados"
        description={`${filtered.length} resultado${filtered.length === 1 ? "" : "s"}`}
        actions={
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="size-4" /> Novo chamado
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="pl-9 h-9" />
          </div>
           <div className="flex items-center gap-1 ml-auto flex-wrap">
             <button
               onClick={() => setFilter("all")}
               className={cn(
                 "h-8 px-3 rounded-md text-xs font-medium transition-colors",
                 filter === "all" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
               )}
             >
               Todos
             </button>
             {columns.map((col: any) => (
               <button
                 key={col.id}
                 onClick={() => setFilter(col.id)}
                 className={cn(
                   "h-8 px-3 rounded-md text-xs font-medium transition-colors",
                   filter === col.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                 )}
               >
                 {col.label}
               </button>
             ))}
           </div>
        </div>

        <div className="rounded-xl border border-border bg-background overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Nenhum chamado encontrado.</div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((t) => (
                <li key={t.id}>
                  <Link to={`/app/tickets/${t.id}`} className="grid grid-cols-[3rem_8rem_1fr_8rem_5rem_3rem] items-center gap-3 px-4 py-3 hover:bg-surface-1 text-sm">
                    <span className="text-xs text-muted-foreground tabular-nums">#{t.number}</span>
                     <span className="flex items-center gap-1.5 text-xs">
                       <span className={cn("size-1.5 rounded-full", getStatusColor(t.status))} />
                       {getStatusLabel(t.status)}
                     </span>
                    <span className="font-medium truncate">{t.subject}</span>
                    <span className="hidden md:block text-xs text-muted-foreground truncate">{t.category ?? "—"}</span>
                    <span className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={`size-1.5 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                      {PRIORITY_LABEL[t.priority]}
                    </span>
                    <span className="text-xs text-muted-foreground text-right">{timeAgo(t.created_at)}</span>
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

export default Tickets;
