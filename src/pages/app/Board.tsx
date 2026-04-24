import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
 import { Plus, Settings2, Trash2, GripVertical } from "lucide-react";
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
 import { Input } from "@/components/ui/input";
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
     if (!org) return;
     const { data } = await supabase
       .from("tickets")
       .select("id,number,subject,status,priority,created_at")
       .eq("organization_id", org.id)
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

   const columns = (kanbanConfig as any)?.columns || [
     { id: "open", label: "Aberto", color: "bg-status-open" },
     { id: "in_progress", label: "Em andamento", color: "bg-status-progress" },
     { id: "waiting", label: "Aguardando", color: "bg-status-waiting" },
     { id: "resolved", label: "Resolvido", color: "bg-status-resolved" },
     { id: "closed", label: "Fechado", color: "bg-muted" },
   ];

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
               <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Personalizar Kanban</DialogTitle>
                </DialogHeader>
                 <div className="space-y-4 py-4">
                   {columns.map((col: any, index: number) => (
                     <div key={col.id} className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg group">
                       <div className="flex-1 space-y-3">
                         <div className="flex gap-3">
                           <div className="flex-1 space-y-1.5">
                             <Label>Nome da Coluna</Label>
                             <Input 
                               value={col.label} 
                               onChange={(e) => {
                                 const newCols = [...columns];
                                 newCols[index] = { ...col, label: e.target.value };
                                 updateSettings({ ...kanbanConfig as any, columns: newCols });
                               }}
                             />
                           </div>
                           <div className="w-40 space-y-1.5">
                             <Label>Cor</Label>
                             <Select 
                               value={col.color} 
                               onValueChange={(val) => {
                                 const newCols = [...columns];
                                 newCols[index] = { ...col, color: val };
                                 updateSettings({ ...kanbanConfig as any, columns: newCols });
                               }}
                             >
                               <SelectTrigger><SelectValue /></SelectTrigger>
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
                       </div>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="mt-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                         onClick={() => {
                           const newCols = columns.filter((_: any, i: number) => i !== index);
                           updateSettings({ ...kanbanConfig as any, columns: newCols });
                         }}
                       >
                         <Trash2 className="size-4" />
                       </Button>
                     </div>
                   ))}
                   <Button 
                     variant="outline" 
                     className="w-full border-dashed" 
                     onClick={() => {
                       const newId = `custom_${Math.random().toString(36).substr(2, 9)}`;
                       const newCols = [...columns, { id: newId, label: "Nova Coluna", color: "bg-muted" }];
                       updateSettings({ ...kanbanConfig as any, columns: newCols });
                     }}
                   >
                     <Plus className="size-4 mr-2" /> Adicionar Coluna
                   </Button>
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
         <div 
           className="grid gap-3 min-w-[1100px]"
           style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
         >
           {columns.map((col: any) => {
             const items = tickets.filter((t) => t.status === col.id);
            return (
               <div
                 key={col.id}
                 className="rounded-xl border border-border bg-surface-1 p-2 min-h-[60vh]"
                 onDragOver={(e) => e.preventDefault()}
                 onDrop={(e) => onDrop(col.id, e)}
               >
                 <div className="flex items-center justify-between px-2 py-1.5">
                   <div className="flex items-center gap-1.5 text-xs font-medium">
                     <span className={cn("size-1.5 rounded-full", col.color)} />
                     {col.label}
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