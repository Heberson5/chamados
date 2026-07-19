import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getPriorityLabel } from "@/lib/utils/priority";
import { useChamadoStatuses } from "@/hooks/useChamadoStatuses";
import {
  Play, CheckCircle, Pause, History, Plus, ArrowRightLeft,
  MessageSquare, FileText, Paperclip, X, Send, Loader2, AlertTriangle,
} from "lucide-react";

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

interface ChamadoDetailDialogProps {
  ticket: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  userRole: string | null;
  currentUserId: string | null;
  agents: any[];
  priorities: any[];
  readOnly?: boolean;
  onTransferred?: (ticketId: string) => void;
}

export default function ChamadoDetailDialog({
  ticket,
  open,
  onOpenChange,
  onUpdate,
  userRole,
  currentUserId,
  agents,
  priorities,
  readOnly = false,
  onTransferred,
}: ChamadoDetailDialogProps) {
  const { toast } = useToast();
  const { getLabel, getStatusRow, isEncerrado, isInicial, isCancelado, getStatusIdByLegacyEnum } = useChamadoStatuses();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [commentPreviews, setCommentPreviews] = useState<string[]>([]);

  const [isClosureDialogOpen, setIsClosureDialogOpen] = useState(false);
  const [closureNote, setClosureNote] = useState("");

  const [isPrevisaoDialogOpen, setIsPrevisaoDialogOpen] = useState(false);
  const [previsaoValue, setPrevisaoValue] = useState("");

  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isTransferConfirmOpen, setIsTransferConfirmOpen] = useState(false);
  const [transferToId, setTransferToId] = useState("");
  const [transferMotivo, setTransferMotivo] = useState("");

  const fetchComments = useCallback(async (ticketId: string) => {
    const { data } = await supabase
      .from("comentarios_chamado")
      .select(`*, autor:profiles(nome, sobrenome)`)
      .eq("chamado_id", ticketId)
      .order("criado_em", { ascending: true });
    if (data) setComments(data);
  }, []);

  useEffect(() => {
    if (open && ticket) {
      setSelectedTicket(ticket);
      fetchComments(ticket.id);
      setNewComment("");
      setCommentFiles([]);
      setCommentPreviews([]);
    }
  }, [open, ticket, fetchComments]);

  useEffect(() => {
    if (open && selectedTicket) {
      const channel = supabase
        .channel(`comments-${selectedTicket.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "comentarios_chamado", filter: `chamado_id=eq.${selectedTicket.id}` },
          () => fetchComments(selectedTicket.id)
        )
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [open, selectedTicket, fetchComments]);

  const handleAction = async (
    action: "atender" | "encerrar" | "reabrir" | "pausar" | "retomar" | "aguardar_usuario",
    extra?: { previsao?: string | null }
  ) => {
    if (!selectedTicket) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: current } = await supabase.from("chamados").select("*").eq("id", selectedTicket.id).single();
      if (!current) return;

      const updates: any = {};
      const now = new Date().toISOString();

      if (action === "atender") {
        const targetId = getStatusIdByLegacyEnum("EM_ATENDIMENTO");
        if (targetId) updates.status_id = targetId;
        updates.tecnico_id = user.id;
        updates.atendido_em = current.atendido_em || now;
        if (extra?.previsao) updates.previsao_conclusao = new Date(extra.previsao).toISOString();
      } else if (action === "reabrir") {
        const targetId = getStatusIdByLegacyEnum("EM_ATENDIMENTO");
        if (targetId) updates.status_id = targetId;
        updates.encerrado_em = null;
        updates.reaberto = true;
      } else if (action === "encerrar") {
        const targetId = getStatusIdByLegacyEnum("ENCERRADO");
        if (targetId) updates.status_id = targetId;
        updates.encerrado_em = now;
        if (!current.atendido_em) updates.atendido_em = now;
        updates.descricao_encerramento = closureNote;
        await supabase.from("comentarios_chamado").insert({
          chamado_id: selectedTicket.id,
          autor_id: user.id,
          comentario: `[ENCERRAMENTO] ${closureNote}`,
        });
      } else if (action === "pausar") {
        const targetId = getStatusIdByLegacyEnum("PAUSADO");
        if (targetId) updates.status_id = targetId;
        updates.pausado_em = now;
      } else if (action === "aguardar_usuario") {
        const targetId = getStatusIdByLegacyEnum("AGUARDANDO_USUARIO");
        if (targetId) updates.status_id = targetId;
        updates.aguardando_usuario_em = now;
      } else if (action === "retomar") {
        const targetId = getStatusIdByLegacyEnum("EM_ATENDIMENTO");
        if (targetId) updates.status_id = targetId;
        if (current.status === "PAUSADO" && current.pausado_em) {
          const diff = Math.floor((Date.now() - new Date(current.pausado_em).getTime()) / 1000);
          updates.tempo_total_pausado = (current.tempo_total_pausado || 0) + diff;
          updates.pausado_em = null;
        }
        if (current.status === "AGUARDANDO_USUARIO" && current.aguardando_usuario_em) {
          const diff = Math.floor((Date.now() - new Date(current.aguardando_usuario_em).getTime()) / 1000);
          updates.tempo_total_aguardando_usuario = (current.tempo_total_aguardando_usuario || 0) + diff;
          updates.aguardando_usuario_em = null;
        }
      }

      const { error } = await supabase.from("chamados").update(updates).eq("id", selectedTicket.id);
      if (error) throw error;

      const { data: updatedTicket } = await supabase
        .from("chamados")
        .select(`*, owner:profiles!chamados_usuario_id_fkey(email, nome, sobrenome)`)
        .eq("id", selectedTicket.id)
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
            descricao: updatedTicket.descricao,
          });
        });
      }

      setSelectedTicket((prev: any) => (prev ? { ...prev, ...updates } : prev));
      toast({ title: "Status atualizado", description: `Chamado ${action === "encerrar" ? "encerrado" : "atualizado"} com sucesso.` });
      onUpdate();
      setIsClosureDialogOpen(false);
      setClosureNote("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleChangePriority = async (priorityId: string) => {
    if (!selectedTicket) return;
    try {
      const { error } = await supabase.from("chamados").update({ prioridade_id: priorityId }).eq("id", selectedTicket.id);
      if (error) throw error;
      const newPriority = priorities.find((p) => p.id === priorityId) || null;
      setSelectedTicket((prev: any) => (prev ? { ...prev, prioridade_id: priorityId, prioridade_obj: newPriority } : prev));
      toast({ title: "Prioridade atualizada" });
      onUpdate();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao atualizar prioridade", description: error.message });
    }
  };

  const handleCommentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setCommentFiles((prev) => [...prev, ...files]);
      setCommentPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    }
  };

  const removeCommentFile = (index: number) => {
    setCommentFiles((prev) => prev.filter((_, i) => i !== index));
    setCommentPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleAddComment = async () => {
    if (!selectedTicket || (!newComment.trim() && commentFiles.length === 0)) return;
    setIsSendingComment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const uploadedUrls: string[] = [];
      for (const file of commentFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `comments/${user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from("chamados_anexos").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("chamados_anexos").getPublicUrl(filePath);
        uploadedUrls.push(publicUrl);
      }

      const { error: commentError } = await supabase.from("comentarios_chamado").insert({
        chamado_id: selectedTicket.id,
        autor_id: user.id,
        comentario: newComment,
        anexos: uploadedUrls.length > 0 ? uploadedUrls : null,
      });
      if (commentError) throw commentError;

      const recipientId = user.id === selectedTicket.usuario_id ? selectedTicket.tecnico_id : selectedTicket.usuario_id;
      if (recipientId) {
        const { data: recipientProfile } = await supabase
          .from("profiles")
          .select("email, nome, sobrenome")
          .eq("id", recipientId)
          .single();

        await supabase.from("notificacoes").insert({
          usuario_id: recipientId,
          titulo: `Nova interação no chamado ${selectedTicket.os}`,
          mensagem: `${user.email} incluiu uma nova informação no chamado: ${selectedTicket.titulo}`,
          link: `/chamados?id=${selectedTicket.id}`,
        });

        if (recipientProfile) {
          import("@/utils/email").then(({ sendTemplatedEmail }) => {
            sendTemplatedEmail(recipientProfile.email, "new_interaction", {
              user: `${recipientProfile.nome} ${recipientProfile.sobrenome || ""}`.trim() || recipientProfile.email,
              os: selectedTicket.os || "",
              titulo: selectedTicket.titulo,
              comentario: newComment,
            });
          });
        }
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

  const handleTransfer = async () => {
    if (!transferToId || !selectedTicket) return;
    if (!transferMotivo.trim()) {
      toast({ variant: "destructive", title: "Motivo obrigatório", description: "Informe o motivo da transferência." });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tecnicoAnteriorId = selectedTicket.tecnico_id || user.id;

      const { error: trErr } = await supabase.from("transferencias_chamado").insert({
        chamado_id: selectedTicket.id,
        tecnico_anterior_id: tecnicoAnteriorId,
        tecnico_novo_id: transferToId,
        motivo: transferMotivo.trim(),
        transferido_por: user.id,
      });
      if (trErr) throw trErr;

      const transferUpdates: any = { tecnico_id: transferToId, atualizado_em: new Date().toISOString() };
      const emAtendimentoId = getStatusIdByLegacyEnum("EM_ATENDIMENTO");
      if (emAtendimentoId) transferUpdates.status_id = emAtendimentoId;
      const { error } = await supabase
        .from("chamados")
        .update(transferUpdates)
        .eq("id", selectedTicket.id);
      if (error) throw error;

      await supabase.from("comentarios_chamado").insert({
        chamado_id: selectedTicket.id,
        autor_id: user.id,
        comentario: `[TRANSFERÊNCIA] Chamado transferido. Motivo: ${transferMotivo.trim()}`,
      });

      try {
        const { data: newTec } = await supabase
          .from("profiles")
          .select("email, nome, sobrenome")
          .eq("id", transferToId)
          .single();
        await supabase.from("notificacoes").insert({
          usuario_id: transferToId,
          titulo: `Chamado ${selectedTicket.os} foi transferido para você`,
          mensagem: `Motivo: ${transferMotivo.trim()}`,
          link: `/chamados?id=${selectedTicket.id}`,
        });
        if (newTec?.email) {
          import("@/utils/email").then(({ sendTemplatedEmail }) => {
            sendTemplatedEmail(newTec.email, "ticket_transferred", {
              user: `${newTec.nome ?? ""} ${newTec.sobrenome ?? ""}`.trim() || newTec.email,
              os: selectedTicket.os || "",
              titulo: selectedTicket.titulo || "",
              motivo: transferMotivo.trim(),
            });
          });
        }
      } catch (e) {
        console.warn("Falha ao notificar técnico destino", e);
      }

      toast({ title: "Chamado transferido", description: "O chamado agora aparece como ENCERRADO (somente visualização) para você." });
      onTransferred?.(selectedTicket.id);
      onUpdate();
      setTransferMotivo("");
      setTransferToId("");
      setIsTransferConfirmOpen(false);
      setIsTransferDialogOpen(false);
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao transferir", description: error.message });
    }
  };

  const canAct = !readOnly && userRole !== "USUARIO" && !isEncerrado(selectedTicket);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 shrink-0 border-b">
            <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate">{selectedTicket?.titulo}</span>
                <Badge variant="outline" className="font-mono text-[10px] shrink-0">{selectedTicket?.os}</Badge>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {canAct && isInicial(selectedTicket) && (
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={() => { setPrevisaoValue(""); setIsPrevisaoDialogOpen(true); }}>
                    <Play size={12} /> Atender
                  </Button>
                )}
                {canAct && !isInicial(selectedTicket) && !isCancelado(selectedTicket) && (
                  <>
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px] border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={() => setIsClosureDialogOpen(true)}>
                      <CheckCircle size={12} /> Encerrar
                    </Button>
                    {getStatusRow(selectedTicket)?.legacy_enum === "EM_ATENDIMENTO" && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={() => handleAction("pausar")}>
                          <Pause size={12} /> Pausar
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={() => handleAction("aguardar_usuario")}>
                          <History size={12} /> Aguardar Usuário
                        </Button>
                      </>
                    )}
                    {["PAUSADO", "AGUARDANDO_USUARIO"].includes(getStatusRow(selectedTicket)?.legacy_enum) && (
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={() => handleAction("retomar")}>
                        <Play size={12} /> Retomar
                      </Button>
                    )}
                  </>
                )}
                {!readOnly && userRole !== "USUARIO" && isEncerrado(selectedTicket) && (
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={() => handleAction("reabrir")}>
                    <Plus size={12} /> Reabrir
                  </Button>
                )}
                {canAct && (
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" onClick={() => setIsTransferDialogOpen(true)}>
                    <ArrowRightLeft size={12} /> Transferir
                  </Button>
                )}
                <Badge variant={
                  isInicial(selectedTicket) ? "default" :
                  getStatusRow(selectedTicket)?.legacy_enum === "EM_ATENDIMENTO" ? "secondary" : "outline"
                }>
                  {getLabel(selectedTicket)}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {selectedTicket && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-slate-100 dark:border-slate-800 mb-2 flex-wrap gap-3">
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
                    <span className="text-xs font-medium mt-1">{Math.round((selectedTicket.tempo_total_pausado || 0) / 60)} min</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <Label className="text-[10px] text-muted-foreground uppercase">Aguardando Usuário</Label>
                    <span className="text-xs font-medium mt-1">{Math.round((selectedTicket.tempo_total_aguardando_usuario || 0) / 60)} min</span>
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
              <div>
                <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Prioridade</Label>
                {canAct ? (
                  <Select value={selectedTicket?.prioridade_id || selectedTicket?.prioridade_obj?.id || ""} onValueChange={handleChangePriority}>
                    <SelectTrigger className="h-8 mt-1 text-sm"><SelectValue placeholder="Selecione a prioridade" /></SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.cor }} />
                            {p.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium">{selectedTicket?.prioridade_obj?.nome || getPriorityLabel(selectedTicket?.prioridade)}</p>
                )}
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
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted transition-colors text-xs bg-card">
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

          {!readOnly && !isEncerrado(selectedTicket) && (
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
                      <Label htmlFor="comment-files-shared" className="cursor-pointer p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                        <Paperclip size={18} />
                        <input id="comment-files-shared" type="file" multiple className="hidden" onChange={handleCommentFileChange} accept="image/*" />
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
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction("encerrar")} disabled={!closureNote.trim()}>
              Confirmar Encerramento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Chamado: {selectedTicket?.os}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selecione o novo responsável</Label>
              {agents.length > 0 ? (
                <Select value={transferToId} onValueChange={setTransferToId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um atendente" /></SelectTrigger>
                  <SelectContent>
                    {agents.filter((a) => a.id !== currentUserId).map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>{agent.nome} {agent.sobrenome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2 text-destructive text-xs">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <p>Não há atendentes ativos disponíveis para transferência. Por favor, contate o administrador.</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Motivo da transferência</Label>
              <Textarea
                value={transferMotivo}
                onChange={(e) => setTransferMotivo(e.target.value)}
                placeholder="Explique por que está transferindo este chamado..."
                className="min-h-[90px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!transferToId) return;
                if (!transferMotivo.trim()) {
                  toast({ variant: "destructive", title: "Motivo obrigatório", description: "Informe o motivo da transferência." });
                  return;
                }
                setIsTransferConfirmOpen(true);
              }}
              disabled={!transferToId || !transferMotivo.trim()}
            >
              Transferir Responsabilidade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isTransferConfirmOpen} onOpenChange={setIsTransferConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar transferência</AlertDialogTitle>
            <AlertDialogDescription>
              O chamado <strong>{selectedTicket?.os}</strong> será transferido para o novo responsável.
              <br /><br />
              Para você, ele passará a ser exibido como <strong>ENCERRADO</strong> no gerenciamento de chamados,
              <strong> somente para visualização</strong>. Você não poderá reabri-lo nem realizar novas ações;
              apenas acompanhar o andamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransfer}>Confirmar transferência</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isPrevisaoDialogOpen} onOpenChange={setIsPrevisaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atender chamado {selectedTicket?.os}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Previsão de conclusão (opcional)</Label>
              <Input type="datetime-local" value={previsaoValue} onChange={(e) => setPrevisaoValue(e.target.value)} />
              <p className="text-xs text-muted-foreground">Informe uma data/hora estimada para a conclusão. Pode deixar em branco.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrevisaoDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                await handleAction("atender", { previsao: previsaoValue || null });
                setIsPrevisaoDialogOpen(false);
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
