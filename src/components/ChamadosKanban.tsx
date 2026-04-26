import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Play, CheckCircle, Clock, AlertTriangle, User, Eye, FileText, MessageSquare, Send, Paperclip, Image as ImageIcon, X, Loader2 } from "lucide-react";
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
       case "P1": return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
       case "P2": return "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400";
       case "P3": return "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400";
       default: return "text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400";
     }
   };
 
   const getPriorityLabel = (priority: string) => {
     const labels: Record<string, string> = { P1: "Crítica", P2: "Alta", P3: "Média", P4: "Baixa", P5: "Muito Baixa" };
     return labels[priority] || priority;
   };
 
   const [slaInfo, setSlaInfo] = useState({ label: "Calculando...", color: "bg-gray-400" });
 
   useEffect(() => {
     const calc = () => {
       if (ticket.status === "ENCERRADO") {
         setSlaInfo({ label: "FINALIZADO", color: "bg-blue-500" });
         return;
       }
       if (!ticket.sla_deadline) {
         setSlaInfo({ label: "N/A", color: "bg-gray-400" });
         return;
       }
       const deadline = new Date(ticket.sla_deadline);
       const now = new Date();
       const diffMinutes = (deadline.getTime() - now.getTime()) / (1000 * 60);
       
       if (diffMinutes < 0) setSlaInfo({ label: "VENCIDO", color: "bg-red-500" });
       else if (diffMinutes < 30) setSlaInfo({ label: "VENCENDO", color: "bg-yellow-500 animate-pulse" });
       else setSlaInfo({ label: "NO PRAZO", color: "bg-green-500" });
     };
     calc();
     const interval = setInterval(calc, 60000);
     return () => clearInterval(interval);
   }, [ticket]);
 
   return (
     <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
       <Card className={`shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing border-slate-200 dark:border-slate-800 ${ticket.status === "ENCERRADO" ? "cursor-default grayscale-[0.3]" : ""}`}>
         <CardHeader className="p-4 pb-2">
           <div className="flex justify-between items-start mb-2">
             <Badge className={`${getPriorityColor(ticket.prioridade)} border-none text-[10px] px-1.5 py-0`}>
               {getPriorityLabel(ticket.prioridade)}
             </Badge>
             <span className="text-[10px] font-mono text-muted-foreground">{ticket.os}</span>
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
         <CardFooter className="p-4 pt-0 flex gap-2">
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
           {columnId === "EM_ATENDIMENTO" && userRole !== "USUARIO" && (
             <Button 
               size="sm" 
               variant="outline"
               className="flex-1 gap-2 text-[10px] h-8 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
               onClick={(e) => { e.stopPropagation(); onOpenClosure(ticket); }}
             >
               <CheckCircle size={12} /> Encerrar
             </Button>
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
        const { data } = await supabase
          .from("profiles")
          .select("regra, is_master")
          .eq("id", user.id)
          .single();
         if (data) {
           setUserRole(data.is_master ? 'MASTER' : data.regra);
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

   const handleAction = async (ticketId: string, action: "atender" | "encerrar" | "reabrir") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates: any = {};
      if (action === "atender") {
        updates.status = "EM_ATENDIMENTO";
        updates.tecnico_id = user.id;
       } else if (action === "reabrir") {
         updates.status = "EM_ATENDIMENTO";
         updates.encerrado_em = null;
       } else if (action === "encerrar") {
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
       const { error } = await supabase
         .from("chamados")
         .update({ status: newStatus })
         .eq("id", ticketId);
 
       if (error) throw error;
       toast({ title: "Status atualizado", description: `Chamado movido para ${newStatus}` });
       onUpdate();
     } catch (error: any) {
       toast({ variant: "destructive", title: "Erro ao mover chamado", description: error.message });
     }
   };
 
        updates.status = "ENCERRADO";
        updates.encerrado_em = new Date().toISOString();
        updates.descricao_encerramento = closureNote;
      }
      const { error } = await supabase
        .from("chamados")
        .update(updates)
        .eq("id", ticketId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: action === "atender" ? "Você assumiu o chamado." : "Chamado encerrado.",
      });
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

  const fetchComments = async (ticketId: string) => {
    const { data, error } = await supabase
      .from("comentarios_chamado")
      .select(`*, autor:profiles(nome, sobrenome)`)
      .eq("chamado_id", ticketId)
      .order("criado_em", { ascending: true });
    
    if (data) setComments(data);
  };

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

   const getPriorityColor = (priority: string) => {
     switch (priority) {
       case "P1": return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
       case "P2": return "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400";
       case "P3": return "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400";
       default: return "text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400";
     }
   };
 
   const getPriorityLabel = (priority: string) => {
     const labels: Record<string, string> = {
       P1: "Crítica",
       P2: "Alta",
       P3: "Média",
       P4: "Baixa",
       P5: "Muito Baixa"
     };
     return labels[priority] || priority;
   };

   return (
     <>
       <DndContext 
         sensors={sensors} 
         collisionDetection={closestCorners} 
         onDragEnd={handleDragEnd}
       >
         <div className={`grid grid-cols-1 md:grid-cols-${kanbanCols.length} gap-6 h-full min-h-[600px]`}>
           {kanbanCols.map((column) => (
             <div key={column.id} className={`flex flex-col rounded-xl border ${column.color} p-4`}>
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
      </DialogContent>
    </Dialog>
    </>
  );
}