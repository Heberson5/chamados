import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Settings2 } from "lucide-react";
import { NewTicketDialog } from "@/components/NewTicketDialog";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, STATUS_ORDER, PRIORITY_DOT, PRIORITY_LABEL, timeAgo } from "@/lib/ticket-meta";
import { useKanbanSettings } from "@/hooks/useKanbanSettings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type T = {
  id: string; number: number; subject: string; status: string;
  priority: string; created_at: string;
};

const Board = () => {
  const { org } = useAuth();
  const { data: kanbanConfig, updateSettings } = useKanbanSettings();
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

  const columnColors = kanbanConfig?.columnColors || {
    open: "bg-status-open",
    in_progress: "bg-status-progress",
    resolved: "bg-status-resolved",
    closed: "bg-status-closed",
    pending: "bg-status-pending"
  };

  const colorOptions = [
    { label: "Azul", value: "bg-status-open" },
    { label: "Amarelo", value: "bg-status-progress" },
    { label: "Verde", value: "bg-status-resolved" },
    { label: "Vermelho", value: "bg-destructive" },
    { label: "Cinza", value: "bg-muted" },
    { label: "Roxo", value: "bg-primary" },
  ];

  return (
    <>
      <PageHeader
        title="Kanban"
        description="Arraste cards para atualizar o status"
        actions={
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Settings2 className="size-4" /> Personalizar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Personalizar Kanban</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {STATUS_ORDER.map((s) => (
                    <div key={s} className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">{STATUS_LABEL[s]}</Label>
                      <div className="col-span-3">
                        <Select 
                          value={columnColors[s]} 
                          onValueChange={(val) => updateSettings({ 
                            ...kanbanConfig, 
                            columnColors: { ...columnColors, [s]: val } 
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {colorOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  <div className={cn("size-2 rounded-full", opt.value)} />
                                  {opt.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> Novo chamado
            </Button>
          </div>
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
                    <span className={cn("size-1.5 rounded-full", columnColors[s])} />
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