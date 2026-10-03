import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DrawerContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import { StatusPill, PriorityIndicator, SlaChip, UserAvatar } from "@/components/tickets/TicketBits";
import { getSlaInfo, formatDuration, timeAgo } from "@/lib/tickets";
import { useChamadoStatuses } from "@/hooks/useChamadoStatuses";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Play, CheckCircle, Pause, History, ArrowRightLeft, RotateCcw, MoreHorizontal, UserPlus,
  MessageSquare, FileText, Paperclip, X, Send, Loader2, AlertTriangle, Ticket as TicketIcon,
} from "lucide-react";

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
  const { getLabel, getStatusRow, isEncerrado, isInicial, isCancelado, getStatusIdByLegacyEnum, getStatusIdByFlag } = useChamadoStatuses();
  const { hasPermission } = usePermissions();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [commentPreviews, setCommentPreviews] = useState<string[]>([]);

  const [isClosureDialogOpen, setIsClosureDialogOpen] = useState(false);
  const [closureNote, setClosureNote] = useState("");

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");

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
    action: "atender" | "encerrar" | "cancelar" | "reabrir" | "pausar" | "retomar" | "aguardar_usuario",
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
      } else if (action === "cancelar") {
        const targetId = getStatusIdByFlag("is_cancelado");
        if (targetId) updates.status_id = targetId;
        updates.encerrado_em = now;
        updates.descricao_encerramento = cancelNote || "Cancelado";
        await supabase.from("comentarios_chamado").insert({
          chamado_id: selectedTicket.id,
          autor_id: user.id,
          comentario: `[CANCELAMENTO] ${cancelNote || "Sem motivo informado"}`,
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
      const actionLabel = action === "encerrar" ? "encerrado" : action === "cancelar" ? "cancelado" : "atualizado";
      toast({ title: "Status atualizado", description: `Chamado ${actionLabel} com sucesso.` });
      onUpdate();
      setIsClosureDialogOpen(false);
      setClosureNote("");
      setIsCancelDialogOpen(false);
      setCancelNote("");
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

  // Piso histórico: técnico/admin/master sempre puderam fazer essas ações.
  // Combinado com OR à permissão granular (Permissões > Chamados), então dar
  // um toggle a mais nunca tira o que já funcionava, só pode ampliar (ex:
  // liberar "Transferir" também para um Usuário, se o admin quiser).
  const isTecnicoOuAcima = userRole !== "USUARIO";
  const notClosed = !readOnly && !isEncerrado(selectedTicket);
  const canAtender = notClosed && (isTecnicoOuAcima || hasPermission("chamados:assumir_chamado"));
  const canEditarPrioridade = notClosed && (isTecnicoOuAcima || hasPermission("chamados:editar"));
  const canEncerrar = notClosed && (isTecnicoOuAcima || hasPermission("chamados:encerrar"));
  const canReabrir = !readOnly && isEncerrado(selectedTicket) && (isTecnicoOuAcima || hasPermission("chamados:reabrir"));
  const canTransferir = notClosed && (isTecnicoOuAcima || hasPermission("chamados:transferir"));
  // Mantido como regra fixa: Cancelar só para Admin/Master, como pedido —
  // a permissão granular aqui só pode restringir ainda mais (AND), nunca
  // liberar para técnico/usuário.
  const canCancel = !readOnly && (userRole === "ADMIN" || userRole === "MASTER") && hasPermission("chamados:cancelar") && !isEncerrado(selectedTicket) && !isCancelado(selectedTicket);
  // Alias mantido para não quebrar os blocos de Encerrar/Pausar/Retomar
  // abaixo, que continuam agrupados pela mesma condição de "chamado em
  // andamento, não cancelado".
  const canAct = canEncerrar;

  const statusRow = getStatusRow(selectedTicket);
  const legacy = statusRow?.legacy_enum;
  const inProgress = !!selectedTicket && !isInicial(selectedTicket) && !isCancelado(selectedTicket) && !isEncerrado(selectedTicket);
  const isPaused = legacy === "PAUSADO" || legacy === "AGUARDANDO_USUARIO";

  // Ação principal (botão cheio) conforme o momento do chamado; o resto vai
  // para "Mais ações" — mesmas regras de permissão de antes.
  type Act = { key: string; label: string; icon: typeof Play; run: () => void; danger?: boolean };
  const allActions: Act[] = [];
  if (canAtender && isInicial(selectedTicket)) allActions.push({ key: "atender", label: "Atender", icon: Play, run: () => { setPrevisaoValue(""); setIsPrevisaoDialogOpen(true); } });
  if (canAct && inProgress && isPaused) allActions.push({ key: "retomar", label: "Retomar atendimento", icon: Play, run: () => handleAction("retomar") });
  if (canAct && inProgress) allActions.push({ key: "encerrar", label: "Encerrar chamado", icon: CheckCircle, run: () => setIsClosureDialogOpen(true) });
  if (canAct && inProgress && legacy === "EM_ATENDIMENTO") {
    allActions.push({ key: "pausar", label: "Pausar atendimento", icon: Pause, run: () => handleAction("pausar") });
    allActions.push({ key: "aguardar", label: "Aguardar usuário", icon: History, run: () => handleAction("aguardar_usuario") });
  }
  if (canReabrir) allActions.push({ key: "reabrir", label: "Reabrir chamado", icon: RotateCcw, run: () => handleAction("reabrir") });
  const primary = allActions[0];
  const secondary = allActions.slice(1);

  const sla = selectedTicket ? getSlaInfo(selectedTicket, statusRow) : null;
  const slaProgress = (() => {
    if (!selectedTicket?.sla_deadline || !selectedTicket?.gerado_em) return null;
    const start = new Date(selectedTicket.gerado_em).getTime();
    const end = new Date(selectedTicket.sla_deadline).getTime();
    const ref = selectedTicket.encerrado_em ? new Date(selectedTicket.encerrado_em).getTime() : Date.now();
    if (end <= start) return null;
    return Math.min(100, Math.max(0, ((ref - start) / (end - start)) * 100));
  })();
  const fmt = (d?: string | null) => (d ? format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="md:max-w-[880px]">
          {/* Cabeçalho */}
          <div className="px-5 md:px-6 pt-4 pb-4 border-b shrink-0 space-y-3">
            <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground font-medium">
              <TicketIcon size={14} />
              <span className="font-mono font-semibold">#{selectedTicket?.os}</span>
              {selectedTicket?.gerado_em && (
                <span className="truncate">
                  · Aberto {timeAgo(selectedTicket.gerado_em)}
                  {selectedTicket?.usuario?.nome ? ` por ${selectedTicket.usuario.nome} ${selectedTicket.usuario.sobrenome || ""}` : ""}
                </span>
              )}
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 -mr-2" aria-label="Fechar">
                  <X size={17} />
                </Button>
              </DialogClose>
            </div>
            <DialogTitle className="text-xl font-bold leading-snug tracking-tight">
              {selectedTicket?.titulo || "Sem título"}
            </DialogTitle>
            <DialogDescription className="sr-only">Detalhes do chamado {selectedTicket?.os}</DialogDescription>
            <div className="flex flex-wrap items-center gap-2">
              {primary && (
                <Button onClick={primary.run}>
                  <primary.icon size={15} /> {primary.key === "encerrar" ? "Encerrar" : primary.label}
                </Button>
              )}
              {canTransferir && (
                <Button variant="outline" onClick={() => setIsTransferDialogOpen(true)}>
                  <ArrowRightLeft size={15} /> Transferir
                </Button>
              )}
              {(secondary.length > 0 || canCancel) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <MoreHorizontal size={16} /> Mais ações
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {secondary.map((a) => (
                      <DropdownMenuItem key={a.key} onClick={a.run} className="gap-2">
                        <a.icon size={15} /> {a.label}
                      </DropdownMenuItem>
                    ))}
                    {canCancel && (
                      <>
                        {secondary.length > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuItem
                          onClick={() => { setCancelNote(""); setIsCancelDialogOpen(true); }}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <X size={15} /> Cancelar chamado
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {readOnly && (
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-md px-2 py-1 dark:bg-purple-950/40 dark:border-purple-900 dark:text-purple-300">
                  Transferido — somente visualização
                </span>
              )}
              <StatusPill status={statusRow} label={getLabel(selectedTicket)} className="ml-auto" />
            </div>
          </div>

          {/* Corpo: conversa + propriedades */}
          <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden md:grid md:grid-cols-[1fr_280px]">
            <div className="order-2 md:order-1 md:overflow-y-auto custom-scrollbar px-5 md:px-6 py-5 space-y-5">
              <div className="rounded-xl border bg-muted/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserAvatar person={selectedTicket?.usuario} size={26} />
                  <span className="text-sm font-semibold">{selectedTicket?.usuario?.nome} {selectedTicket?.usuario?.sobrenome}</span>
                  <span className="text-xs text-muted-foreground">descreveu o problema · {fmt(selectedTicket?.gerado_em)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{selectedTicket?.descricao}</p>
                {selectedTicket?.anexos && selectedTicket.anexos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedTicket.anexos.map((url: string, idx: number) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 border rounded-lg hover:bg-muted transition-colors text-xs font-medium bg-card">
                        <span className="h-7 w-7 rounded-md bg-accent text-accent-foreground grid place-items-center"><FileText size={14} /></span>
                        Anexo {idx + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                  <MessageSquare size={14} /> Interações {comments.length > 0 && <span className="normal-case tracking-normal">({comments.length})</span>}
                </h4>
                <div className="space-y-3">
                  {comments.map((comment) => {
                    const text: string = comment.comentario || "";
                    const special = text.startsWith("[ENCERRAMENTO]") ? "enc" : text.startsWith("[CANCELAMENTO]") ? "canc" : null;
                    const body = special ? text.replace(/^\[(ENCERRAMENTO|CANCELAMENTO)\]\s*/, "") : text;
                    return (
                      <div key={comment.id} className="flex gap-2.5">
                        <UserAvatar person={comment.autor} size={28} className="mt-0.5" />
                        <div
                          className={cn(
                            "flex-1 min-w-0 rounded-xl border overflow-hidden",
                            special === "enc" && "border-emerald-200 dark:border-emerald-900",
                            special === "canc" && "border-red-200 dark:border-red-900"
                          )}
                        >
                          <div
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 border-b text-[13px] font-semibold bg-muted/50",
                              special === "enc" && "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300",
                              special === "canc" && "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300"
                            )}
                          >
                            {special === "enc" && <CheckCircle size={13} />}
                            {special === "canc" && <X size={13} />}
                            {special === "enc" ? "Encerramento · " : special === "canc" ? "Cancelamento · " : ""}
                            {comment.autor?.nome} {comment.autor?.sobrenome}
                            <span className="ml-auto text-xs font-medium text-muted-foreground" title={fmt(comment.criado_em)}>{timeAgo(comment.criado_em)}</span>
                          </div>
                          <div className="px-3 py-2.5 text-sm whitespace-pre-wrap bg-card">
                            {body}
                            {comment.anexos && comment.anexos.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {comment.anexos.map((url: string, idx: number) => (
                                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block border rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                                    <img src={url} alt="Anexo" className="w-20 h-20 object-cover" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {comments.length === 0 && (
                    <p className="text-center py-6 text-sm text-muted-foreground">Nenhuma interação registrada ainda.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Propriedades */}
            <aside className="order-1 md:order-2 md:overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-l bg-muted/30 p-5 space-y-5">
              {sla && (
                <div
                  className={cn(
                    "rounded-xl border p-3 space-y-2",
                    sla.state === "bad" && "border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/30",
                    sla.state === "warn" && "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30",
                    sla.state === "ok" && "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30",
                    sla.state === "neutral" && "bg-card"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SLA</span>
                    <SlaChip ticket={selectedTicket} status={statusRow} />
                  </div>
                  {slaProgress !== null && (
                    <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", sla.state === "bad" ? "bg-red-500" : sla.state === "warn" ? "bg-amber-500" : "bg-emerald-500")}
                        style={{ width: `${slaProgress}%` }}
                      />
                    </div>
                  )}
                  {selectedTicket?.sla_deadline && (
                    <p className="text-xs text-muted-foreground">Prazo: {fmt(selectedTicket.sla_deadline)}</p>
                  )}
                </div>
              )}

              <Prop label="Responsável">
                {selectedTicket?.tecnico ? (
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <UserAvatar person={selectedTicket.tecnico} size={24} /> {selectedTicket.tecnico.nome} {selectedTicket.tecnico.sobrenome}
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-6 w-6 rounded-full border border-dashed border-input grid place-items-center"><UserPlus size={11} /></span>
                    Sem responsável
                  </span>
                )}
              </Prop>

              <Prop label="Prioridade">
                {canEditarPrioridade ? (
                  <Select value={selectedTicket?.prioridade_id || selectedTicket?.prioridade_obj?.id || ""} onValueChange={handleChangePriority}>
                    <SelectTrigger className="h-9 text-sm bg-card"><SelectValue placeholder="Selecione a prioridade" /></SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <PriorityIndicator priority={p} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <PriorityIndicator priority={selectedTicket?.prioridade_obj} legacy={selectedTicket?.prioridade} />
                )}
              </Prop>

              <Prop label="Solicitante">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <UserAvatar person={selectedTicket?.usuario} size={24} /> {selectedTicket?.usuario?.nome} {selectedTicket?.usuario?.sobrenome}
                </span>
              </Prop>

              <Prop label="Detalhes">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
                  <dt className="text-muted-foreground">Aberto em</dt><dd className="text-right font-medium tabular-nums">{fmt(selectedTicket?.gerado_em)}</dd>
                  <dt className="text-muted-foreground">Início</dt><dd className="text-right font-medium tabular-nums">{fmt(selectedTicket?.atendido_em)}</dd>
                  {selectedTicket?.previsao_conclusao && (<><dt className="text-muted-foreground">Previsão</dt><dd className="text-right font-medium tabular-nums">{fmt(selectedTicket.previsao_conclusao)}</dd></>)}
                  <dt className="text-muted-foreground">Pausado</dt><dd className="text-right font-medium tabular-nums">{formatDuration((selectedTicket?.tempo_total_pausado || 0) / 60)}</dd>
                  <dt className="text-muted-foreground">Aguard. usuário</dt><dd className="text-right font-medium tabular-nums">{formatDuration((selectedTicket?.tempo_total_aguardando_usuario || 0) / 60)}</dd>
                  {selectedTicket?.encerrado_em && (<><dt className="text-muted-foreground">Finalizado</dt><dd className="text-right font-medium tabular-nums text-emerald-600">{fmt(selectedTicket.encerrado_em)}</dd></>)}
                </dl>
              </Prop>
            </aside>
          </div>

          {/* Nova interação */}
          {!readOnly && !isEncerrado(selectedTicket) && (
            <div className="border-t bg-card px-5 md:px-6 py-3 shrink-0">
              <div className="rounded-xl border focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15 transition-shadow">
                <textarea
                  placeholder="Escreva uma nova interação…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  rows={2}
                  className="block w-full resize-none bg-transparent px-3 pt-2.5 text-sm placeholder:text-muted-foreground focus:outline-none"
                />
                {commentPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-3 py-2">
                    {commentPreviews.map((url, idx) => (
                      <div key={idx} className="relative w-12 h-12 rounded-lg border overflow-hidden">
                        <img src={url} alt="Prévia" className="w-full h-full object-cover" />
                        <button onClick={() => removeCommentFile(idx)} className="absolute top-0.5 right-0.5 bg-slate-900/70 text-white rounded-full p-0.5" aria-label="Remover anexo"><X size={9} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1 px-2 pb-2">
                  <Label htmlFor="comment-files-shared" className="cursor-pointer p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground" title="Anexar imagem">
                    <Paperclip size={17} />
                    <input id="comment-files-shared" type="file" multiple className="hidden" onChange={handleCommentFileChange} accept="image/*" />
                  </Label>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground ml-1">
                    <span className="kbd">Ctrl</span><span className="kbd">Enter</span> envia
                  </span>
                  <Button size="sm" onClick={handleAddComment} disabled={isSendingComment || (!newComment.trim() && commentFiles.length === 0)} className="ml-auto">
                    {isSendingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Enviar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
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
                className="flex min-h-[120px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
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

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Chamado: {selectedTicket?.os}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo do Cancelamento</Label>
              <textarea
                placeholder="Explique por que este chamado está sendo cancelado..."
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                className="flex min-h-[120px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>Voltar</Button>
            <Button variant="destructive" onClick={() => handleAction("cancelar")} disabled={!cancelNote.trim()}>
              Confirmar Cancelamento
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

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
