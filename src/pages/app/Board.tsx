import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { NewTicketDialog } from "@/components/NewTicketDialog";
import { STATUS_DOT, STATUS_LABEL, STATUS_ORDER, PRIORITY_DOT, PRIORITY_LABEL, timeAgo } from "@/lib/ticket-meta";

type T = {
  id: string; number: number; subject: string; status: string;
  priority: string; created_at: string;
};

const Board = () => {
  const { org } = useAuth();
  const [tickets, setTickets] = useState<T[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("tickets")
      .select("id,number,subject,status,priority,created_at")
      .order("created_at", { ascending: false });
    setTickets((data as T[]) ?? []);
  };
  useEffect(() => { if (org) load(); }, [org]);

  const onDrop = async (status: string, e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    const patch: any = { status };
    if (status === "resolved") patch.resolved_at = new Date().toISOString();
    await supabase.from("tickets").update(patch).eq("id", id);
  };

  return (
    <>
      <PageHeader
        title="Kanban"
        description="Arraste cards para atualizar o status"
        actions={
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="size-4" /> Novo chamado
          </Button>
        }
      />
      <div className="p-6 overflow-x-auto">
        <div className="grid grid-cols-5 gap-3 min-w-[1100px]">
          {STATUS_ORDER.map((s) => {
            const items = tickets.filter((t) => t.status === s);
            return (
              <div
                key={s}
                className="rounded-xl border border-border bg-surface-1 p-2 min-h-[60vh]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(s, e)}
              >
                <div className="flex items-center justify-between px-2 py-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <span className={`size-1.5 rounded-full ${STATUS_DOT[s]}`} />
                    {STATUS_LABEL[s]}
                  </div>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-2 mt-1">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                      className="rounded-lg border border-border bg-background p-3 shadow-xs hover:shadow-soft transition-shadow cursor-grab active:cursor-grabbing"
                    >
                      <Link to={`/app/tickets/${t.id}`} className="block">
                        <div className="text-[11px] text-muted-foreground tabular-nums">#{t.number}</div>
                        <div className="text-sm font-medium mt-0.5 line-clamp-2">{t.subject}</div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className={`size-1.5 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                            {PRIORITY_LABEL[t.priority]}
                          </span>
                          <span>{timeAgo(t.created_at)}</span>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <NewTicketDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </>
  );
};

export default Board;