import { Button } from "@/components/ui/button";
import { Play, CheckCircle, Loader2, Pause, History, RotateCcw, MessageSquare, Paperclip, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityIndicator, SlaChip, UserAvatar } from "@/components/tickets/TicketBits";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import ChamadoDetailDialog from "@/components/ChamadoDetailDialog";
import { usePermissions } from "@/hooks/usePermissions";
  import { useState, useEffect, useCallback } from "react";
  import { 
    DndContext, 
    closestCorners, 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors, 
    DragOverlay,
    defaultDropAnimationSideEffects,
    useDroppable
  } from "@dnd-kit/core";
  import { 
    arrayMove, 
    SortableContext, 
    sortableKeyboardCoordinates, 
    verticalListSortingStrategy,
    useSortable
  } from "@dnd-kit/sortable";
  import { CSS } from "@dnd-kit/utilities";

  function DroppableColumn({ id, children, className, style }: any) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
      <div
        ref={setNodeRef}
        className={`${className} ${isOver ? "ring-2 ring-primary/40" : ""}`}
        style={style}
      >
        {children}
      </div>
    );
  }

 function SortableCard({ ticket, columnId, columnMeta, userRole, onUpdate, onDetails, onAction, onOpenClosure, onAtender, isMaster, selected, onToggleSelect }: any) {
   const isReadOnly = !!ticket.__transferredAway;
   const { hasPermission } = usePermissions();
   // Mesmo piso histórico do detalhe do chamado (técnico/admin/master sempre
   // puderam), combinado com OR à permissão granular — só amplia, nunca tira.
   const isTecnicoOuAcima = userRole !== "USUARIO";
   const canAtender = isTecnicoOuAcima || hasPermission("chamados:assumir_chamado");
   const canEncerrarKanban = isTecnicoOuAcima || hasPermission("chamados:encerrar");
   const canReabrirKanban = isTecnicoOuAcima || hasPermission("chamados:reabrir");
   const {
     attributes,
     listeners,
     setNodeRef,
     transform,
     transition,
     isDragging
   } = useSortable({
     id: ticket.id,
     data: { ticket, columnId },
       disabled: userRole === "USUARIO" || isReadOnly
   });
 
   const style = {
     transform: CSS.Translate.toString(transform),
     transition,
     opacity: isDragging ? 0.5 : 1,
   };
 
   // Re-renderiza a cada minuto para o tempo restante do SLA ficar atualizado.
   const [, setTick] = useState(0);
   useEffect(() => {
     const i = setInterval(() => setTick((x) => x + 1), 60000);
     return () => clearInterval(i);
   }, []);

   const statusRow = columnMeta
     ? { cor: columnMeta.color_hex, is_pausa: columnMeta.is_pausa, is_encerrado: columnMeta.is_encerrado, is_cancelado: columnMeta.is_cancelado }
     : undefined;
   const comments = ticket.comentarios_chamado?.[0]?.count || 0;
   const closed = columnMeta?.is_encerrado || columnMeta?.is_cancelado;
   const inProgress = columnMeta && !columnMeta.is_inicial && !columnMeta.is_encerrado && !columnMeta.is_cancelado;

   const actions: { key: string; label: string; icon: typeof Play; onClick: () => void; className?: string }[] = [];
   if (!isReadOnly) {
     if (columnMeta?.is_inicial && canAtender) {
       actions.push({ key: "atender", label: "Atender", icon: Play, className: "text-primary", onClick: () => (onAtender ? onAtender(ticket) : onAction(ticket.id, "atender")) });
     }
     if (inProgress && canEncerrarKanban) {
       actions.push({ key: "encerrar", label: "Encerrar", icon: CheckCircle, className: "text-emerald-600", onClick: () => onOpenClosure(ticket) });
       if (columnMeta.legacy_enum === "EM_ATENDIMENTO") {
         actions.push({ key: "pausar", label: "Pausar", icon: Pause, onClick: () => onAction(ticket.id, "pausar") });
         actions.push({ key: "aguardar", label: "Aguardar usuário", icon: History, onClick: () => onAction(ticket.id, "aguardar_usuario") });
       }
       if (columnMeta.legacy_enum === "PAUSADO" || columnMeta.legacy_enum === "AGUARDANDO_USUARIO") {
         actions.push({ key: "retomar", label: "Retomar", icon: Play, className: "text-amber-600", onClick: () => onAction(ticket.id, "retomar") });
       }
     }
     if (columnMeta?.is_encerrado && canReabrirKanban) {
       actions.push({ key: "reabrir", label: "Reabrir", icon: RotateCcw, onClick: () => onAction(ticket.id, "reabrir") });
     }
   }

   return (
     <div
       ref={setNodeRef}
       style={style}
       {...attributes}
       {...listeners}
       onClick={() => onDetails(ticket)}
       className={cn(
         "group relative rounded-xl border bg-card p-3 shadow-xs transition-all select-none",
         isReadOnly || userRole === "USUARIO" ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
         "hover:shadow-elevated hover:border-input",
         selected && "border-primary ring-2 ring-primary/20",
         closed && "opacity-75 hover:opacity-100",
         isDragging && "shadow-floating"
       )}
     >
       <div className="flex items-center gap-2 mb-1.5">
         {isMaster && (
           <input
             type="checkbox"
             className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))] cursor-pointer shrink-0"
             checked={!!selected}
             onClick={(e) => e.stopPropagation()}
             onPointerDown={(e) => e.stopPropagation()}
             onChange={() => onToggleSelect?.(ticket.id)}
             aria-label={`Selecionar chamado ${ticket.os}`}
           />
         )}
         <span className="text-[11.5px] font-semibold font-mono text-muted-foreground">#{ticket.os}</span>
         {isReadOnly && (
           <span className="text-[10.5px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded px-1 dark:bg-purple-950/40 dark:border-purple-900 dark:text-purple-300">Transferido</span>
         )}
         {ticket.reaberto && (
           <span className="text-[10.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300">Reaberto</span>
         )}
         <PriorityIndicator priority={ticket.prioridade_obj} legacy={ticket.prioridade} className="ml-auto" />
       </div>
       <p className="text-[13.5px] font-semibold leading-snug line-clamp-2 mb-2.5">{ticket.titulo || "Sem título"}</p>
       <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
         <SlaChip ticket={ticket} status={statusRow} />
         {comments > 0 && (
           <span className="inline-flex items-center gap-1"><MessageSquare size={13} />{comments}</span>
         )}
         {ticket.anexos?.length > 0 && (
           <span className="inline-flex items-center gap-1"><Paperclip size={13} />{ticket.anexos.length}</span>
         )}
         <span className="ml-auto">
           {ticket.tecnico ? (
             <UserAvatar person={ticket.tecnico} size={24} />
           ) : (
             <span className="h-6 w-6 rounded-full border border-dashed border-input grid place-items-center" title="Sem responsável">
               <UserPlus size={11} />
             </span>
           )}
         </span>
       </div>
       {actions.length > 0 && (
         <div
           className="absolute right-2 bottom-2 hidden md:group-hover:flex items-center gap-0.5 rounded-lg border bg-card p-0.5 shadow-elevated"
           onPointerDown={(e) => e.stopPropagation()}
         >
           {actions.map((a) => (
             <button
               key={a.key}
               type="button"
               title={a.label}
               aria-label={a.label}
               onClick={(e) => { e.stopPropagation(); a.onClick(); }}
               className={cn("h-7 w-7 grid place-items-center rounded-md hover:bg-muted text-muted-foreground", a.className)}
             >
               <a.icon size={15} />
             </button>
           ))}
         </div>
       )}
     </div>
   );
 }

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ChamadosKanbanProps {
  tickets: any[];
  onUpdate: () => void;
  isMaster?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

 export default function ChamadosKanban({ tickets, onUpdate, isMaster, selectedIds, onToggleSelect }: ChamadosKanbanProps) {
    const { toast } = useToast();
    const [agents, setAgents] = useState<any[]>([]);
     const [transferredAwayIds, setTransferredAwayIds] = useState<Set<string>>(new Set());
     const [currentUserId, setCurrentUserId] = useState<string | null>(null);

   const sensors = useSensors(
     useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
     useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
   );
 
    const handleDragEnd = async (event: any) => {
      if (userRole === "USUARIO") return;
      const { active, over } = event;
      if (!over) return;
 
      const ticketId = active.id;
      // over.id can be a column id (when dropping on empty area) OR another
      // ticket id (when hovering over a card). Resolve the target column via
      // the sortable containerId that dnd-kit exposes on the over item.
      const overContainerId = over.data?.current?.sortable?.containerId;
      const newStatus = overContainerId ?? over.id;
      const currentStatus = active.data.current.columnId;

      // Guard: only accept known column ids (avoids sending a ticket UUID as status)
      if (!kanbanCols.some((c) => c.id === newStatus)) return;
 
     if (newStatus === currentStatus) return;

      try {
        const targetCol = kanbanCols.find((c) => c.id === newStatus);
        const updates: any = { status_id: newStatus };
        const now = new Date().toISOString();
        const ticket = tickets.find(t => t.id === ticketId);

        // Handle timestamps on drag — mantém exatamente o comportamento dos
        // 6 status conhecidos (via legacy_enum/flags); colunas novas criadas
        // em Configurações só movem o chamado, sem efeitos colaterais extras.
        if (targetCol?.legacy_enum === "EM_ATENDIMENTO") {
          if (ticket && !ticket.atendido_em) {
            updates.atendido_em = now;
            const { data: { user } } = await supabase.auth.getUser();
            if (user) updates.tecnico_id = user.id;
          }
        } else if (targetCol?.is_encerrado || targetCol?.is_cancelado) {
          updates.encerrado_em = now;
          if (ticket && !ticket.atendido_em) {
            // If moving to closed without having attended, set attended_em to now too
            updates.atendido_em = now;
            const { data: { user } } = await supabase.auth.getUser();
            if (user) updates.tecnico_id = user.id;
          }
          // Fallback closure note if dragged
          updates.descricao_encerramento = ticket?.descricao_encerramento || "Encerrado via Kanban";
        } else if (targetCol?.is_inicial) {
          // Reset if moved back to open (optional but good for consistency)
          updates.encerrado_em = null;
        }

       const { data: updatedTicket, error } = await supabase
         .from("chamados")
         .update(updates)
         .eq("id", ticketId)
         .select(`*, owner:profiles!chamados_usuario_id_fkey(email, nome, sobrenome)`)
         .single();

        if (error) throw error;
        const colLabel = targetCol?.title || newStatus;
        toast({ title: "Status atualizado", description: `Chamado movido para ${colLabel}` });
       onUpdate();

       // Send status change email
       if (updatedTicket && updatedTicket.owner) {
          import("@/utils/email").then(async ({ sendTemplatedEmail }) => {
            const { data: st } = await supabase
              .from("chamado_statuses")
              .select("label")
              .eq("id", updatedTicket.status_id)
              .maybeSingle();
            sendTemplatedEmail(updatedTicket.owner.email, "status_change", {
             user: `${updatedTicket.owner.nome} ${updatedTicket.owner.sobrenome || ""}`.trim() || updatedTicket.owner.email,
             os: updatedTicket.os || "",
             titulo: updatedTicket.titulo,
              status: st?.label || updatedTicket.status
           });
         });
       }
     } catch (error: any) {
       toast({ variant: "destructive", title: "Erro ao mover chamado", description: error.message });
     }
   };
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [closureNote, setClosureNote] = useState("");
  const [isClosureDialogOpen, setIsClosureDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPrevisaoDialogOpen, setIsPrevisaoDialogOpen] = useState(false);
  const [previsaoValue, setPrevisaoValue] = useState<string>("");
  const [previsaoTicket, setPrevisaoTicket] = useState<any>(null);
   const [userRole, setUserRole] = useState<string | null>(null);
   const [priorities, setPriorities] = useState<any[]>([]);
   // Preenchido a partir de chamado_statuses (fonte real do board) no
   // useEffect abaixo — fica vazio até lá, para não desenhar um conjunto
   // de colunas provisório que "pisca" e troca assim que os dados reais
   // chegam.
   const [kanbanCols, setKanbanCols] = useState<any[]>([]);
   const [colsLoaded, setColsLoaded] = useState(false);

       const fetchAgents = useCallback(async () => {
        const { data } = await supabase
          .from("profiles")
          .select("id, nome, sobrenome")
          .eq("pode_receber_chamados", true)
          .neq("is_master", true)
          .eq("ativo", true);
        if (data) setAgents(data);
      }, []);

      useEffect(() => {
        const loadData = async () => {
         fetchAgents();
         supabase.from("chamados_prioridades").select("*").order("ordem").then(({ data }) => {
           if (data) setPriorities(data);
         });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          // Load tickets I transferred away — they should appear as read-only/encerrado for me
          const { data: myTransfers } = await supabase
            .from("transferencias_chamado")
            .select("chamado_id")
            .eq("tecnico_anterior_id", user.id);
          if (myTransfers) {
            setTransferredAwayIds(new Set(myTransfers.map((t: any) => t.chamado_id)));
          }
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
           if (profile) {
             setUserRole(profile.is_master ? 'MASTER' : profile.regra);
           }
         }

          // Load columns from chamado_statuses (source of truth). Column id
          // é o próprio id da linha, permitindo colunas ilimitadas — chamados
          // são filtrados por status_id, não pelo enum legado (que fica só
          // como sombra de compatibilidade, sincronizada por gatilho no banco).
          const { data: statuses } = await supabase
            .from("chamado_statuses")
            .select("*")
            .eq("ativo", true)
            .order("ordem", { ascending: true });
          if (statuses && statuses.length > 0) {
            setKanbanCols(
              statuses.map((s: any) => ({
                id: s.id,
                title: s.label,
                color_hex: s.cor,
                is_inicial: s.is_inicial,
                is_pausa: s.is_pausa,
                is_encerrado: s.is_encerrado,
                is_cancelado: s.is_cancelado,
                legacy_enum: s.legacy_enum,
              }))
            );
          }
          setColsLoaded(true);
       };
       loadData();
     }, []);

    const handleAction = async (ticketId: string, action: "atender" | "encerrar" | "reabrir" | "pausar" | "retomar" | "aguardar_usuario", extra?: { previsao?: string | null }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

        // Fetch current ticket state to calculate time differences
        const { data: ticket } = await supabase.from("chamados").select("*").eq("id", ticketId).single();
        if (!ticket) return;

      const updates: any = {};
        const now = new Date().toISOString();
        // As 6 ações continuam mirando exatamente os mesmos status conhecidos
        // de sempre (via legacy_enum) — colunas novas criadas em Configurações
        // não ganham atalho de ação, só recebem chamados por arrastar-e-soltar.
        const statusIdFor = (legacyEnum: string) => kanbanCols.find((c) => c.legacy_enum === legacyEnum)?.id;

      if (action === "atender") {
        const targetId = statusIdFor("EM_ATENDIMENTO");
        if (targetId) updates.status_id = targetId;
        updates.tecnico_id = user.id;
          updates.atendido_em = now;
          if (extra?.previsao) {
            updates.previsao_conclusao = new Date(extra.previsao).toISOString();
          }
       } else if (action === "reabrir") {
         const targetId = statusIdFor("EM_ATENDIMENTO");
         if (targetId) updates.status_id = targetId;
         updates.encerrado_em = null;
         updates.reaberto = true;
       } else if (action === "encerrar") {
        const targetId = statusIdFor("ENCERRADO");
        if (targetId) updates.status_id = targetId;
          updates.encerrado_em = now;
          if (!ticket.atendido_em) {
            updates.atendido_em = now;
          }
        updates.descricao_encerramento = closureNote;

          // Insert closure note as a comment
          await supabase.from("comentarios_chamado").insert({
            chamado_id: ticketId,
            autor_id: user.id,
            comentario: `[ENCERRAMENTO] ${closureNote}`
          });
        } else if (action === "pausar") {
          const targetId = statusIdFor("PAUSADO");
          if (targetId) updates.status_id = targetId;
          updates.pausado_em = now;
        } else if (action === "aguardar_usuario") {
          const targetId = statusIdFor("AGUARDANDO_USUARIO");
          if (targetId) updates.status_id = targetId;
          updates.aguardando_usuario_em = now;
        } else if (action === "retomar") {
          const targetId = statusIdFor("EM_ATENDIMENTO");
          if (targetId) updates.status_id = targetId;

          if (ticket.status === "PAUSADO" && ticket.pausado_em) {
            const pauseStart = new Date(ticket.pausado_em).getTime();
            const diff = Math.floor((new Date().getTime() - pauseStart) / 1000);
            updates.tempo_total_pausado = (ticket.tempo_total_pausado || 0) + diff;
            updates.pausado_em = null;
          }
          
          if (ticket.status === "AGUARDANDO_USUARIO" && ticket.aguardando_usuario_em) {
            const waitStart = new Date(ticket.aguardando_usuario_em).getTime();
            const diff = Math.floor((new Date().getTime() - waitStart) / 1000);
            updates.tempo_total_aguardando_usuario = (ticket.tempo_total_aguardando_usuario || 0) + diff;
            updates.aguardando_usuario_em = null;
          }
        }

      const { error } = await supabase
        .from("chamados")
        .update(updates)
        .eq("id", ticketId);

       if (error) throw error;
 
       const { data: updatedTicket } = await supabase
         .from("chamados")
         .select(`*, owner:profiles!chamados_usuario_id_fkey(email, nome, sobrenome)`)
         .eq("id", ticketId)
         .single();
 
       if (updatedTicket && updatedTicket.owner) {
          import("@/utils/email").then(async ({ sendTemplatedEmail }) => {
           const trigger = action === "encerrar" ? "ticket_closed" : "status_change";
            const { data: st } = await supabase
              .from("chamado_statuses")
              .select("label")
              .eq("id", updatedTicket.status_id)
              .maybeSingle();
            sendTemplatedEmail(updatedTicket.owner.email, trigger, {
             user: `${updatedTicket.owner.nome} ${updatedTicket.owner.sobrenome || ""}`.trim() || updatedTicket.owner.email,
             os: updatedTicket.os || "",
             titulo: updatedTicket.titulo,
              status: st?.label || updatedTicket.status,
             descricao: updatedTicket.descricao
           });
         });
       }
 
       toast({
         title: "Status Atualizado",
         description: `Chamado ${action === "encerrar" ? "encerrado" : "atualizado"} com sucesso.`,
       } as any);
 
       onUpdate();
      setIsClosureDialogOpen(false);
      setClosureNote("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const openClosureDialog = (ticket: any) => {
    setSelectedTicket(ticket);
    setIsClosureDialogOpen(true);
  };

  const openDetails = (ticket: any) => {
    setSelectedTicket(ticket);
    setIsDetailsOpen(true);
  };

  const ticketsInColumn = (column: any) =>
    tickets.filter((t) => {
      if (transferredAwayIds.has(t.id)) return column.is_encerrado;
      return t.status_id === column.id;
    });

     if (!colsLoaded) {
       return (
         <div className="flex justify-center items-center py-24">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
       );
     }

     return (
       <>
         <DndContext
           sensors={sensors} 
           collisionDetection={closestCorners} 
           onDragEnd={handleDragEnd}
         >
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:h-full md:min-h-[480px] overflow-x-auto pb-3 custom-scrollbar">
             {kanbanCols.map((column) => {
               const colTickets = ticketsInColumn(column);
               return (
                <DroppableColumn
                  key={column.id}
                  id={column.id}
                  className="flex flex-col rounded-2xl border bg-muted/50 p-2.5 w-full md:w-[290px] xl:w-[310px] flex-shrink-0 md:h-full md:overflow-hidden transition-shadow"
                >
                 <div className="flex items-center gap-2 px-1.5 pt-0.5 pb-2.5 shrink-0">
                   <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: column.color_hex || "hsl(var(--primary))" }} />
                   <h3 className="font-semibold text-[13.5px] truncate">{column.title}</h3>
                   <span className="text-xs font-semibold text-muted-foreground">{colTickets.length}</span>
                 </div>

                <SortableContext
                  id={column.id}
                  items={colTickets.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                   <div className="flex-1 space-y-2 md:overflow-y-auto custom-scrollbar min-h-[60px]">
                    {colTickets.map((ticket) => (
                        <SortableCard
                          key={ticket.id}
                          ticket={{ ...ticket, __transferredAway: transferredAwayIds.has(ticket.id) }}
                          columnId={column.id}
                          columnMeta={column}
                          userRole={userRole}
                          onUpdate={onUpdate}
                          onDetails={openDetails}
                          onAction={handleAction}
                          onOpenClosure={openClosureDialog}
                          onAtender={(t: any) => { setPrevisaoTicket(t); setPrevisaoValue(""); setIsPrevisaoDialogOpen(true); }}
                          isMaster={isMaster}
                          selected={selectedIds?.has(ticket.id)}
                          onToggleSelect={onToggleSelect}
                        />
                      ))}

                    {colTickets.length === 0 && (
                     <div className="flex items-center justify-center py-8 text-xs text-muted-foreground border border-dashed rounded-xl">
                       Nenhum chamado
                     </div>
                   )}
                 </div>
               </SortableContext>
              </DroppableColumn>
               );
             })}
         </div>
       </DndContext>
 
       <Dialog open={isClosureDialogOpen} onOpenChange={setIsClosureDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerrar Chamado: {selectedTicket?.os}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Resumo do Atendimento</Label>
            <textarea 
              placeholder="Descreva o que foi feito para resolver este chamado..."
              value={closureNote}
              onChange={(e) => setClosureNote(e.target.value)}
              className="flex min-h-[120px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsClosureDialogOpen(false)}>Cancelar</Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => handleAction(selectedTicket.id, "encerrar")}
            disabled={!closureNote.trim()}
          >
            Confirmar Encerramento
          </Button>
        </DialogFooter>
      </DialogContent>
     </Dialog>
 
     <ChamadoDetailDialog
       ticket={selectedTicket}
       open={isDetailsOpen}
       onOpenChange={setIsDetailsOpen}
       onUpdate={onUpdate}
       userRole={userRole}
       currentUserId={currentUserId}
       agents={agents}
       priorities={priorities}
       readOnly={!!selectedTicket && transferredAwayIds.has(selectedTicket.id)}
       onTransferred={(id) => setTransferredAwayIds(prev => { const next = new Set(prev); next.add(id); return next; })}
     />

    <Dialog open={isPrevisaoDialogOpen} onOpenChange={setIsPrevisaoDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atender chamado {previsaoTicket?.os}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Previsão de conclusão (opcional)</Label>
            <Input
              type="datetime-local"
              value={previsaoValue}
              onChange={(e) => setPrevisaoValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Informe uma data/hora estimada para a conclusão. Pode deixar em branco.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsPrevisaoDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={async () => {
              if (previsaoTicket) {
                await handleAction(previsaoTicket.id, "atender", { previsao: previsaoValue || null });
              }
              setIsPrevisaoDialogOpen(false);
              setPrevisaoTicket(null);
              setPrevisaoValue("");
            }}
          >
            <Play size={14} className="mr-2" /> Atender
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}