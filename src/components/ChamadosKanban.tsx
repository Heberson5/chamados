import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { getPriorityLabel } from "@/lib/utils/priority";
  import { Play, CheckCircle, Clock, AlertTriangle, User, Eye, FileText, MessageSquare, Send, Paperclip, Image as ImageIcon, X, Loader2, Plus, Pause, History } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
  import { useState, useEffect, useCallback } from "react";
  import { 
    DndContext, 
    closestCorners, 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors, 
    DragOverlay,
    defaultDropAnimationSideEffects
  } from "@dnd-kit/core";
  import { 
    arrayMove, 
    SortableContext, 
    sortableKeyboardCoordinates, 
    verticalListSortingStrategy,
    useSortable
  } from "@dnd-kit/sortable";
  import { CSS } from "@dnd-kit/utilities";
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

  function SortableCard({ ticket, columnId, userRole, onUpdate, onDetails, onAction, onOpenClosure }: any) {
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
     disabled: ticket.status === "ENCERRADO"
   });
 
   const style = {
     transform: CSS.Translate.toString(transform),
     transition,
     opacity: isDragging ? 0.5 : 1,
   };
 
     const getPriorityColor = (priority: string) => {
       switch (priority) {
         case "P1": return "text-destructive bg-destructive/10 border-destructive/20";
         case "P2": return "text-orange-600 bg-orange-500/10 border-orange-500/20";
         case "P3": return "text-amber-600 bg-amber-500/10 border-amber-500/20";
         default: return "text-muted-foreground bg-muted border-border";
       }
     };
 
   const [slaInfo, setSlaInfo] = useState({ label: "Calculando...", color: "bg-gray-400" });
 
    useEffect(() => {
      const calc = () => setSlaInfo(getSLAInfo(ticket));
      calc();
      const interval = setInterval(calc, 60000);
      return () => clearInterval(interval);
    }, [ticket]);
 
     return (
       <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-4">
         <Card className={`shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing border-border bg-card text-card-foreground ${ticket.status === "ENCERRADO" ? "cursor-default grayscale-[0.3]" : ""}`}>
           <CardHeader className="p-4 pb-2">
           <div className="flex justify-between items-start mb-2">
             <Badge className={`${getPriorityColor(ticket.prioridade)} border-none text-[10px] px-1.5 py-0`}>
               {getPriorityLabel(ticket.prioridade)}
             </Badge>
               <div className="flex items-center gap-1">
                 {ticket.reaberto && (
                   <Badge variant="outline" className="text-[9px] bg-yellow-100 text-yellow-700 border-yellow-200 px-1 py-0">
                     Reaberto
                   </Badge>
                 )}
                 <span className="text-[10px] font-mono text-muted-foreground">{ticket.os}</span>
               </div>
           </div>
           <CardTitle className="text-sm font-bold line-clamp-2 leading-tight">
             {ticket.titulo || "Sem título"}
           </CardTitle>
         </CardHeader>
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
          <CardFooter className="p-4 pt-0 flex flex-wrap gap-2">
           <Button 
             size="sm" 
             variant="ghost"
             className="flex-1 gap-2 text-[10px] h-8"
             onClick={(e) => { e.stopPropagation(); onDetails(ticket); }}
           >
             <Eye size={12} /> Detalhes
           </Button>
           {columnId === "ABERTO" && userRole !== "USUARIO" && (
             <Button 
               size="sm" 
               className="flex-1 gap-2 text-[10px] h-8"
               onClick={(e) => { e.stopPropagation(); onAction(ticket.id, "atender"); }}
             >
               <Play size={12} /> Atender
             </Button>
           )}
            {["EM_ATENDIMENTO", "PAUSADO", "AGUARDANDO_USUARIO"].includes(columnId) && userRole !== "USUARIO" && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="flex-1 min-w-[80px] gap-2 text-[10px] h-8 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  onClick={(e) => { e.stopPropagation(); onOpenClosure(ticket); }}
                >
                  <CheckCircle size={12} /> Encerrar
                </Button>
                
                {columnId === "EM_ATENDIMENTO" && (
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
                
                {(columnId === "PAUSADO" || columnId === "AGUARDANDO_USUARIO") && (
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
           {ticket.status === "ENCERRADO" && (
             <Button 
               size="sm" 
               variant="secondary"
               className="flex-1 gap-2 text-[10px] h-8"
               onClick={(e) => { e.stopPropagation(); onAction(ticket.id, "reabrir"); }}
             >
               <Plus size={12} /> Reabrir
             </Button>
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
   const sensors = useSensors(
     useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
     useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
   );
 
   const handleDragEnd = async (event: any) => {
     const { active, over } = event;
     if (!over) return;
 
     const ticketId = active.id;
     const newStatus = over.id;
     const currentStatus = active.data.current.columnId;
 
     if (newStatus === currentStatus) return;
     if (currentStatus === "ENCERRADO" && newStatus !== "ENCERRADO") {
       toast({ variant: "destructive", title: "Ação não permitida", description: "Chamados encerrados não podem ser arrastados. Use o botão Reabrir." });
       return;
     }
 
      try {
        const updates: any = { status: newStatus };
        const now = new Date().toISOString();
        
        // Handle timestamps on drag
        if (newStatus === "EM_ATENDIMENTO") {
          const ticket = tickets.find(t => t.id === ticketId);
          if (ticket && !ticket.atendido_em) {
            updates.atendido_em = now;
            const { data: { user } } = await supabase.auth.getUser();
            if (user) updates.tecnico_id = user.id;
          }
        } else if (newStatus === "ENCERRADO" || newStatus === "CANCELADO") {
          updates.encerrado_em = now;
          const ticket = tickets.find(t => t.id === ticketId);
          if (ticket && !ticket.atendido_em) {
            // If moving to closed without having attended, set attended_em to now too
            updates.atendido_em = now;
            const { data: { user } } = await supabase.auth.getUser();
            if (user) updates.tecnico_id = user.id;
          }
          // Fallback closure note if dragged
          updates.descricao_encerramento = ticket?.descricao_encerramento || "Encerrado via Kanban";
        } else if (newStatus === "ABERTO") {
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
       toast({ title: "Status atualizado", description: `Chamado movido para ${newStatus}` });
       onUpdate();
 
       // Send status change email
       if (updatedTicket && updatedTicket.owner) {
         import("@/utils/email").then(({ sendTemplatedEmail }) => {
           sendTemplatedEmail(updatedTicket.owner.email, "status_change", {
             user: `${updatedTicket.owner.nome} ${updatedTicket.owner.sobrenome || ""}`.trim() || updatedTicket.owner.email,
             os: updatedTicket.os || "",
             titulo: updatedTicket.titulo,
             status: updatedTicket.status
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
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [commentPreviews, setCommentPreviews] = useState<string[]>([]);
   const [userRole, setUserRole] = useState<string | null>(null);
   const [kanbanCols, setKanbanCols] = useState<any[]>([
     { id: "ABERTO", title: "Abertos", color: "bg-blue-500/10 border-blue-500/20" },
     { id: "EM_ATENDIMENTO", title: "Em Atendimento", color: "bg-amber-500/10 border-amber-500/20" },
     { id: "ENCERRADO", title: "Encerrados", color: "bg-emerald-500/10 border-emerald-500/20" },
   ]);

     useEffect(() => {
       const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
           if (profile) {
             setUserRole(profile.is_master ? 'MASTER' : profile.regra);
             if (profile.settings && typeof profile.settings === 'object' && (profile.settings as any).kanban_config) {
               setKanbanCols((profile.settings as any).kanban_config);
               return; // Exit early if user has their own config
             }
           }
         }
   
         const { data: settings } = await supabase
           .from("system_settings")
           .select("value")
           .eq("key", "kanban_config")
           .single();
         
         if (settings) {
           setKanbanCols(settings.value as any[]);
         }
       };
       loadData();
     }, []);

    const handleAction = async (ticketId: string, action: "atender" | "encerrar" | "reabrir" | "pausar" | "retomar" | "aguardar_usuario") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

        // Fetch current ticket state to calculate time differences
        const { data: ticket } = await supabase.from("chamados").select("*").eq("id", ticketId).single();
        if (!ticket) return;

      const updates: any = {};
        const now = new Date().toISOString();

      if (action === "atender") {
        updates.status = "EM_ATENDIMENTO";
        updates.tecnico_id = user.id;
          updates.atendido_em = now;
       } else if (action === "reabrir") {
         updates.status = "EM_ATENDIMENTO";
         updates.encerrado_em = null;
         updates.reaberto = true;
       } else if (action === "encerrar") {
        updates.status = "ENCERRADO";
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
          updates.status = "PAUSADO";
          updates.pausado_em = now;
        } else if (action === "aguardar_usuario") {
          updates.status = "AGUARDANDO_USUARIO";
          updates.aguardando_usuario_em = now;
        } else if (action === "retomar") {
          updates.status = "EM_ATENDIMENTO";
          
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
    fetchComments(ticket.id);
  };

   const fetchComments = useCallback(async (ticketId: string) => {
    const { data, error } = await supabase
      .from("comentarios_chamado")
      .select(`*, autor:profiles(nome, sobrenome)`)
      .eq("chamado_id", ticketId)
      .order("criado_em", { ascending: true });
    
     if (data) setComments(data);
    }, []);

  const handleCommentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setCommentFiles(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setCommentPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeCommentFile = (index: number) => {
    setCommentFiles(prev => prev.filter((_, i) => i !== index));
    setCommentPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleAddComment = async () => {
    if (!newComment.trim() && commentFiles.length === 0) return;
    setIsSendingComment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const uploadedUrls = [];
      for (const file of commentFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `comments/${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("chamados_anexos")
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("chamados_anexos")
          .getPublicUrl(filePath);
          
        uploadedUrls.push(publicUrl);
      }

      const { error: commentError } = await supabase.from("comentarios_chamado").insert({
        chamado_id: selectedTicket.id,
        autor_id: user.id,
        comentario: newComment,
        anexos: uploadedUrls.length > 0 ? uploadedUrls : null
      });

      if (commentError) throw commentError;

      const recipientId = user.id === selectedTicket.usuario_id ? selectedTicket.tecnico_id : selectedTicket.usuario_id;
      if (recipientId) {
        await supabase.from("notificacoes").insert({
          usuario_id: recipientId,
          titulo: `Nova interação no chamado ${selectedTicket.os}`,
          mensagem: `${user.email} incluiu uma nova informação no chamado: ${selectedTicket.titulo}`,
          link: `/chamados?id=${selectedTicket.id}`
        });
      }

      setNewComment("");
      setCommentFiles([]);
      setCommentPreviews([]);
      fetchComments(selectedTicket.id);
      toast({ title: "Interação adicionada", description: "Sua mensagem foi enviada com sucesso." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao adicionar comentário", description: error.message });
    } finally {
      setIsSendingComment(false);
    }
  };

   // getPriorityColor removed here as it is already defined above
 
   useEffect(() => {
     if (isDetailsOpen && selectedTicket) {
       const channel = supabase
         .channel(`comments-${selectedTicket.id}`)
         .on(
           'postgres_changes',
           {
             event: '*',
             schema: 'public',
             table: 'comentarios_chamado',
             filter: `chamado_id=eq.${selectedTicket.id}`
           },
           () => {
             fetchComments(selectedTicket.id);
           }
         )
         .subscribe();
 
       return () => {
         supabase.removeChannel(channel);
       };
     }
   }, [isDetailsOpen, selectedTicket, fetchComments]);
 
     return (
       <>
         <DndContext 
           sensors={sensors} 
           collisionDetection={closestCorners} 
           onDragEnd={handleDragEnd}
         >
           <div className="flex flex-col md:flex-row gap-6 h-full min-h-[600px] overflow-x-auto pb-4 custom-scrollbar">
             {kanbanCols.map((column) => (
               <div 
                 key={column.id} 
                 className="flex flex-col rounded-xl border bg-card/50 p-4 min-w-[320px] max-w-[400px] flex-shrink-0"
                 style={{ 
                   borderTop: `4px solid ${column.color_hex || 'hsl(var(--primary))'}`,
                 }}
               >
                 <div className="flex items-center justify-between mb-4 px-2">
                 <h3 className="font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
                   {column.title}
                   <Badge variant="secondary" className="rounded-full px-2 py-0">
                     {tickets.filter(t => t.status === column.id).length}
                   </Badge>
                 </h3>
               </div>
 
               <SortableContext 
                 id={column.id} 
                 items={tickets.filter(t => t.status === column.id).map(t => t.id)} 
                 strategy={verticalListSortingStrategy}
               >
                 <div className="flex-1 space-y-4 overflow-y-auto max-h-[calc(100vh-300px)] pr-2 custom-scrollbar">
                   {tickets
                     .filter((t) => t.status === column.id)
                     .map((ticket) => (
                       <SortableCard 
                         key={ticket.id} 
                         ticket={ticket} 
                         columnId={column.id} 
                         userRole={userRole} 
                         onUpdate={onUpdate}
                         onDetails={openDetails}
                         onAction={handleAction}
                         onOpenClosure={openClosureDialog}
                       />
                     ))}
                   
                   {tickets.filter(t => t.status === column.id).length === 0 && (
                     <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50 border-2 border-dashed rounded-lg">
                       <AlertTriangle size={24} className="mb-2 opacity-20" />
                       <p className="text-xs">Nenhum chamado</p>
                     </div>
                   )}
                 </div>
               </SortableContext>
             </div>
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

    <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0 border-b">
          <DialogTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="truncate">{selectedTicket?.titulo}</span>
              <Badge variant="outline" className="font-mono text-[10px]">{selectedTicket?.os}</Badge>
            </div>
            <Badge variant={
              selectedTicket?.status === 'ABERTO' ? 'default' : 
              selectedTicket?.status === 'EM_ATENDIMENTO' ? 'secondary' : 'outline'
            }>
              {selectedTicket?.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {selectedTicket && (
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-slate-100 dark:border-slate-800 mb-2">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <Label className="text-[10px] text-muted-foreground uppercase">Status SLA</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${getSLAInfo(selectedTicket).color}`} />
                        <span className="text-xs font-bold">{getSLAInfo(selectedTicket).label}</span>
                      </div>
                    </div>
                    {selectedTicket.sla_deadline && (
                      <div className="flex flex-col border-l pl-4">
                        <Label className="text-[10px] text-muted-foreground uppercase">Deadline</Label>
                        <span className="text-xs font-medium mt-1">
                          {format(new Date(selectedTicket.sla_deadline), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col text-right">
                      <Label className="text-[10px] text-muted-foreground uppercase">Pausado</Label>
                      <span className="text-xs font-medium mt-1">
                        {Math.round((selectedTicket.tempo_total_pausado || 0) / 60)} min
                      </span>
                    </div>
                    <div className="flex flex-col text-right">
                      <Label className="text-[10px] text-muted-foreground uppercase">Aguardando Usuário</Label>
                      <span className="text-xs font-medium mt-1">
                        {Math.round((selectedTicket.tempo_total_aguardando_usuario || 0) / 60)} min
                      </span>
                    </div>
                  </div>
                </div>
              )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Solicitante</Label>
              <p className="text-sm font-medium">{selectedTicket?.usuario?.nome} {selectedTicket?.usuario?.sobrenome}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Aberto em</Label>
              <p className="text-sm font-medium">
                {selectedTicket?.gerado_em && format(new Date(selectedTicket.gerado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
            {selectedTicket?.encerrado_em && (
              <div>
                <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Finalizado em</Label>
                <p className="text-sm font-medium text-emerald-600">
                  {format(new Date(selectedTicket.encerrado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Descrição Inicial</Label>
            <div className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap border border-slate-100 dark:border-slate-800">
              {selectedTicket?.descricao}
            </div>
          </div>

          {selectedTicket?.anexos && selectedTicket.anexos.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Anexos Iniciais</Label>
              <div className="flex flex-wrap gap-2">
                {selectedTicket.anexos.map((url: string, idx: number) => (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted transition-colors text-xs bg-card"
                  >
                    <FileText size={14} className="text-primary" />
                    <span className="max-w-[100px] truncate">Anexo {idx + 1}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={14} /> Interações
            </h4>
            
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-primary">{comment.autor?.nome} {comment.autor?.sobrenome}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(comment.criado_em), "dd/MM HH:mm", { locale: ptBR })}</span>
                  </div>
                  <div className="p-3 bg-card rounded-lg border text-sm shadow-sm">
                    {comment.comentario}
                    {comment.anexos && comment.anexos.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {comment.anexos.map((url: string, idx: number) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block border rounded-md overflow-hidden hover:opacity-80 transition-opacity">
                            <img src={url} alt="Anexo" className="w-16 h-16 object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-center py-4 text-xs text-muted-foreground italic">Nenhuma interação registrada ainda.</p>
              )}
            </div>
          </div>
        </div>

        {selectedTicket?.status !== 'ENCERRADO' && (
          <div className="p-6 pt-2 border-t bg-muted/20 shrink-0">
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <textarea
                    placeholder="Escreva uma nova interação..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none pr-10"
                  />
                  <div className="absolute right-2 bottom-2 flex gap-1">
                     <Label htmlFor="comment-files" className="cursor-pointer p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                       <Paperclip size={18} />
                       <input id="comment-files" type="file" multiple className="hidden" onChange={handleCommentFileChange} accept="image/*" />
                     </Label>
                  </div>
                </div>

                {commentPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 py-2">
                    {commentPreviews.map((url, idx) => (
                      <div key={idx} className="relative w-12 h-12 rounded border overflow-hidden">
                        <img src={url} alt="Preview" className="w-full h-full object-cover" />
                        <button onClick={() => removeCommentFile(idx)} className="absolute top-0.5 right-0.5 bg-destructive text-white rounded-full p-0.5"><X size={8} /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button size="sm" onClick={handleAddComment} disabled={isSendingComment || (!newComment.trim() && commentFiles.length === 0)} className="gap-2">
                    {isSendingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Enviar Interação
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}