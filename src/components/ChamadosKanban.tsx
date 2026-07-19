 import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { getPriorityLabel } from "@/lib/utils/priority";
 import { Play, CheckCircle, Clock, AlertTriangle, User, Eye, Loader2, Plus, Pause, History, ChevronDown, ChevronUp } from "lucide-react";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import ChamadoDetailDialog from "@/components/ChamadoDetailDialog";
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

  const getSLAInfo = (ticket: any) => {
    if (ticket.status === "ENCERRADO") {
      return { label: "FINALIZADO", color: "bg-blue-500" };
    }
    if (!ticket.sla_deadline) {
      return { label: "N/A", color: "bg-gray-400" };
    }
    const deadline = new Date(ticket.sla_deadline);
    const now = new Date();
    const diffMinutes = (deadline.getTime() - now.getTime()) / (1000 * 60);
    
    if (diffMinutes < 0) return { label: "VENCIDO", color: "bg-red-500" };
    if (diffMinutes < 30) return { label: "VENCENDO", color: "bg-yellow-500 animate-pulse" };
    return { label: "NO PRAZO", color: "bg-green-500" };
  };

 function SortableCard({ ticket, columnId, columnMeta, userRole, onUpdate, onDetails, onAction, onOpenClosure, onAtender }: any) {
   const isReadOnly = !!ticket.__transferredAway;
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
 
      const getPriorityStyle = (ticket: any) => {
        if (ticket.prioridade_obj) {
          return {
            backgroundColor: `${ticket.prioridade_obj.cor}20`,
            color: ticket.prioridade_obj.cor
          };
        }
        switch (ticket.prioridade) {
          case "P1": return { color: "var(--destructive)", backgroundColor: "var(--destructive-foreground)" };
          case "P2": return { color: "#ea580c", backgroundColor: "#fff7ed" };
          case "P3": return { color: "#d97706", backgroundColor: "#fffbeb" };
          default: return {};
        }
      };
 
   const [slaInfo, setSlaInfo] = useState({ label: "Calculando...", color: "bg-gray-400" });
   const [expanded, setExpanded] = useState(false);

    useEffect(() => {
      const calc = () => setSlaInfo(getSLAInfo(ticket));
      calc();
      const interval = setInterval(calc, 60000);
      return () => clearInterval(interval);
    }, [ticket]);

     return (
       <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-4">
          <Card className={`cursor-grab active:cursor-grabbing border-border bg-card text-card-foreground ${columnMeta?.is_encerrado || isReadOnly ? "cursor-default grayscale-[0.3]" : ""}`}>
           <CardHeader className="p-4 pb-2">
           <div className="flex justify-between items-start mb-2">
            <Badge
                className="border-none text-[10px] px-1.5 py-0"
                style={getPriorityStyle(ticket)}
              >
                {ticket.prioridade_obj?.nome || getPriorityLabel(ticket.prioridade)}
              </Badge>
               <div className="flex items-center gap-1">
                  {isReadOnly && (
                    <Badge variant="outline" className="text-[9px] bg-purple-100 text-purple-700 border-purple-200 px-1 py-0">
                      Transferido
                    </Badge>
                  )}
                 {ticket.reaberto && (
                   <Badge variant="outline" className="text-[9px] bg-yellow-100 text-yellow-700 border-yellow-200 px-1 py-0">
                     Reaberto
                   </Badge>
                 )}
                 <span className="text-[10px] font-mono text-muted-foreground">{ticket.os}</span>
                 <button
                   type="button"
                   onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                   className="text-muted-foreground hover:text-foreground p-0.5 -mr-1 rounded transition-colors"
                   title={expanded ? "Minimizar" : "Expandir"}
                 >
                   {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                 </button>
               </div>
           </div>
           <div className="flex items-center justify-between gap-2">
             <CardTitle className={`text-sm font-bold leading-tight ${expanded ? "line-clamp-2" : "line-clamp-1"}`}>
               {ticket.titulo || "Sem título"}
             </CardTitle>
             {!expanded && (
               <div className="flex items-center gap-1 shrink-0">
                 <div className={`w-1.5 h-1.5 rounded-full ${slaInfo.color}`} />
                 <span className="text-[9px] font-bold">{slaInfo.label}</span>
               </div>
             )}
           </div>
         </CardHeader>
         {expanded && (
         <CardContent className="p-4 pt-0">
           <p className="text-xs text-muted-foreground line-clamp-3 mb-4">
             {ticket.descricao}
           </p>
           <div className="space-y-2">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                 <User size={12} />
                 <span className="truncate">{ticket.usuario?.nome} {ticket.usuario?.sobrenome}</span>
               </div>
               <div className="flex items-center gap-1">
                 <div className={`w-1.5 h-1.5 rounded-full ${slaInfo.color}`} />
                 <span className="text-[9px] font-bold">{slaInfo.label}</span>
               </div>
             </div>
             <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
               <Clock size={12} />
               <span>{format(new Date(ticket.gerado_em), "dd/MM HH:mm", { locale: ptBR })}</span>
             </div>
           </div>
         </CardContent>
         )}
          <CardFooter className="p-4 pt-0 flex flex-wrap gap-2">
           <Button
             size="sm"
             variant="ghost"
             className="flex-1 gap-2 text-[10px] h-8"
             onClick={(e) => { e.stopPropagation(); onDetails(ticket); }}
           >
             <Eye size={12} /> Detalhes
           </Button>
           {expanded && (
           <>
            {!isReadOnly && columnMeta?.is_inicial && userRole !== "USUARIO" && (
             <Button
               size="sm"
               className="flex-1 gap-2 text-[10px] h-8"
             onClick={(e) => { e.stopPropagation(); onAtender ? onAtender(ticket) : onAction(ticket.id, "atender"); }}
             >
               <Play size={12} /> Atender
             </Button>
           )}
             {!isReadOnly && columnMeta && !columnMeta.is_inicial && !columnMeta.is_encerrado && !columnMeta.is_cancelado && userRole !== "USUARIO" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 min-w-[80px] gap-2 text-[10px] h-8 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  onClick={(e) => { e.stopPropagation(); onOpenClosure(ticket); }}
                >
                  <CheckCircle size={12} /> Encerrar
                </Button>

                {columnMeta.legacy_enum === "EM_ATENDIMENTO" && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 min-w-[80px] gap-2 text-[10px] h-8 text-slate-600"
                      onClick={(e) => { e.stopPropagation(); onAction(ticket.id, "pausar"); }}
                    >
                      <Pause size={12} /> Pausar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 min-w-[80px] gap-2 text-[10px] h-8 text-indigo-600"
                      onClick={(e) => { e.stopPropagation(); onAction(ticket.id, "aguardar_usuario"); }}
                    >
                      <History size={12} /> Aguardar Usuário
                    </Button>
                  </>
                )}

                {(columnMeta.legacy_enum === "PAUSADO" || columnMeta.legacy_enum === "AGUARDANDO_USUARIO") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 min-w-[80px] gap-2 text-[10px] h-8 text-amber-600"
                    onClick={(e) => { e.stopPropagation(); onAction(ticket.id, "retomar"); }}
                  >
                    <Play size={12} /> Retomar
                  </Button>
                )}
              </>
            )}
           {!isReadOnly && columnMeta?.is_encerrado && (
             <Button
               size="sm"
               variant="secondary"
               className="flex-1 gap-2 text-[10px] h-8"
               onClick={(e) => { e.stopPropagation(); onAction(ticket.id, "reabrir"); }}
             >
               <Plus size={12} /> Reabrir
             </Button>
           )}
           </>
           )}
         </CardFooter>
       </Card>
     </div>
   );
 }

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ChamadosKanbanProps {
  tickets: any[];
  onUpdate: () => void;
}

 export default function ChamadosKanban({ tickets, onUpdate }: ChamadosKanbanProps) {
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
            <div className="flex flex-col md:flex-row gap-6 items-stretch md:h-full md:min-h-[500px] overflow-x-auto pb-4 custom-scrollbar">
             {kanbanCols.map((column) => (
                <DroppableColumn
                  key={column.id}
                  id={column.id}
                  className="flex flex-col rounded-xl border bg-card/50 p-4 min-w-[320px] xl:min-w-[360px] w-full md:w-[360px] xl:w-[400px] flex-shrink-0 md:h-full md:overflow-hidden"
                  style={{
                    borderTop: `4px solid ${column.color_hex || 'hsl(var(--primary))'}`,
                  }}
                >
                 <div className="flex items-center justify-between mb-4 px-2 shrink-0">
                 <h3 className="font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
                   {column.title}
                   <Badge variant="secondary" className="rounded-full px-2 py-0">
                     {ticketsInColumn(column).length}
                   </Badge>
                 </h3>
               </div>

                <SortableContext
                  id={column.id}
                  items={ticketsInColumn(column).map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                   <div className="flex-1 space-y-4 pr-1 md:overflow-y-auto custom-scrollbar">
                    {ticketsInColumn(column)
                      .map((ticket) => (
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
                        />
                      ))}

                    {ticketsInColumn(column).length === 0 && (
                     <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50 border-2 border-dashed rounded-lg">
                       <AlertTriangle size={24} className="mb-2 opacity-20" />
                       <p className="text-xs">Nenhum chamado</p>
                     </div>
                   )}
                 </div>
               </SortableContext>
              </DroppableColumn>
           ))}
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
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
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