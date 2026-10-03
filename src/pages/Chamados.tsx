import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ArrowRight, AlertTriangle, Loader2, X, LayoutGrid, List, Play, CheckCircle, Pause, RotateCcw, Trash2, MessageSquare, Paperclip, UserPlus, Inbox, Clock, Send, History, ChevronDown, Ticket as TicketIcon } from "lucide-react";
import ChamadosKanban from "@/components/ChamadosKanban";
import ChamadoDetailDialog from "@/components/ChamadoDetailDialog";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { useSortableTable, useColumnVisibility } from "@/hooks/useSortableTable";
 import { SortableTableHead } from "@/components/SortableTableHead";
 import { ColumnVisibilityMenu, type ColumnDef } from "@/components/ColumnVisibilityMenu";
 import { useChamadoStatuses } from "@/hooks/useChamadoStatuses";
import { cn } from "@/lib/utils";
import { StatusPill, PriorityIndicator, SlaChip, UserAvatar } from "@/components/tickets/TicketBits";
import { getSlaInfo, formatDuration, timeAgo } from "@/lib/tickets";

export default function Chamados() {
  const [tickets, setTickets] = useState<any[]>([]);
  type TicketRow = (typeof tickets)[number];
  const [searchTerm, setSearchTerm] = useState("");
   const [statusFilter, setStatusFilter] = useState<string>("todos");
   const [viewFilter, setViewFilter] = useState<string>("todos");
   const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingTickets, setIsFetchingTickets] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
    const [newTicket, setNewTicket] = useState<{
      titulo: string;
      descricao: string;
      prioridade_id: string;
      tecnico_id: string;
    }>({
      titulo: "",
      descricao: "",
      prioridade_id: "",
       tecnico_id: "none"
    });
    const [agents, setAgents] = useState<any[]>([]);
    const [priorities, setPriorities] = useState<any[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
    const [showRetro, setShowRetro] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const [retroativo, setRetroativo] = useState({
      ativarAbertura: false,
      dataAbertura: "",
      ativarInicio: false,
      dataInicio: "",
      ativarSuspensao: false,
      dataSuspensao: "",
    });
  const { toast } = useToast();
  const { isMaster, hasPermission } = usePermissions();
  // Regra fixa: essas duas são só para Master, como pedido — a permissão
  // granular (Permissões > Chamados) só pode restringir ainda mais (AND),
  // nunca liberar para técnico/admin/usuário.
  const canBulkDelete = isMaster && hasPermission("chamados:excluir_em_massa");
  const canRetroactive = isMaster && hasPermission("chamados:cadastro_retroativo");
  const { statuses, getLabel, getStatusRow, getStatusIdByLegacyEnum, getStatusIdByFlag } = useChamadoStatuses();

   const runAction = async (ticket: any, action: "atender" | "encerrar" | "reabrir" | "pausar" | "retomar") => {
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
       const now = new Date().toISOString();
       const updates: any = {};
       if (action === "atender") {
         const targetId = getStatusIdByLegacyEnum("EM_ATENDIMENTO");
         if (targetId) updates.status_id = targetId;
         updates.tecnico_id = user.id;
         if (!ticket.atendido_em) updates.atendido_em = now;
       } else if (action === "encerrar") {
         const targetId = getStatusIdByLegacyEnum("ENCERRADO");
         if (targetId) updates.status_id = targetId;
         updates.encerrado_em = now;
         if (!ticket.atendido_em) updates.atendido_em = now;
         updates.descricao_encerramento = ticket.descricao_encerramento || "Encerrado via lista";
       } else if (action === "reabrir") {
         const targetId = getStatusIdByLegacyEnum("EM_ATENDIMENTO");
         if (targetId) updates.status_id = targetId;
         updates.encerrado_em = null;
         updates.reaberto = true;
       } else if (action === "pausar") {
         const targetId = getStatusIdByLegacyEnum("PAUSADO");
         if (targetId) updates.status_id = targetId;
         updates.pausado_em = now;
       } else if (action === "retomar") {
         const targetId = getStatusIdByLegacyEnum("EM_ATENDIMENTO");
         if (targetId) updates.status_id = targetId;
         if (ticket.status === "PAUSADO" && ticket.pausado_em) {
           const diff = Math.floor((Date.now() - new Date(ticket.pausado_em).getTime()) / 1000);
           updates.tempo_total_pausado = (ticket.tempo_total_pausado || 0) + diff;
           updates.pausado_em = null;
         }
       }
       const { error } = await supabase.from("chamados").update(updates).eq("id", ticket.id);
       if (error) throw error;
       toast({ title: "Chamado atualizado", description: `Ação: ${action}` });
       await fetchTickets();
     } catch (e: any) {
       toast({ variant: "destructive", title: "Erro", description: e.message });
     }
   };

   const toggleSelectOne = (id: string) => {
     setSelectedIds(prev => {
       const next = new Set(prev);
       if (next.has(id)) next.delete(id); else next.add(id);
       return next;
     });
   };

   const handleDeleteSelected = async () => {
     if (selectedIds.size === 0) return;
     setIsDeleting(true);
     try {
       const { error } = await supabase.from("chamados").delete().in("id", Array.from(selectedIds));
       if (error) throw error;
       toast({ title: "Chamados excluídos", description: `${selectedIds.size} chamado(s) removido(s) permanentemente.` });
       setSelectedIds(new Set());
       setIsDeleteDialogOpen(false);
       await fetchTickets();
     } catch (e) {
       toast({ variant: "destructive", title: "Erro ao excluir chamados", description: e instanceof Error ? e.message : String(e) });
     } finally {
       setIsDeleting(false);
     }
   };

   const fetchTickets = useCallback(async () => {
     const { data, error } = await supabase
        .from("chamados")
        .select(`
          *,
          tecnico:profiles!chamados_tecnico_id_fkey(nome, sobrenome, avatar_url),
          usuario:profiles!chamados_usuario_id_fkey(nome, sobrenome, avatar_url),
          chamado_pai:chamado_pai_id(os),
          prioridade_obj:prioridade_id(id, nome, cor, ordem),
          comentarios_chamado(count),
          interacoes:comentarios_chamado(comentario)
        `)
        .order("gerado_em", { ascending: false });
     
     if (error) {
       toast({ variant: "destructive", title: "Erro ao buscar chamados", description: error.message });
       setIsFetchingTickets(false);
       return;
     }
     if (data) setTickets(data);
     setIsFetchingTickets(false);
   }, [toast]);

    const fetchAgents = useCallback(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, sobrenome")
        .eq("pode_receber_chamados", true)
        .neq("is_master", true)
        .eq("ativo", true);
      
      if (data) setAgents(data);
    }, []);

    useEffect(() => {
      fetchTickets();
      fetchAgents();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setCurrentUserId(data.user.id);
          supabase.from("profiles").select("*").eq("id", data.user.id).single().then(({ data: prof }) => {
            if (prof) setUserProfile(prof);
          });
        }
      });
 
      // Fetch priorities
      supabase.from("chamados_prioridades").select("*").order("ordem").then(({ data }) => {
        if (data) {
          setPriorities(data);
          if (data.length > 0) {
            setNewTicket(prev => ({ ...prev, prioridade_id: data[0].id }));
          }
        }
      });

     const channel = supabase
       .channel('schema-db-changes')
       .on(
         'postgres_changes',
         {
           event: '*',
           schema: 'public',
           table: 'chamados'
         },
         () => {
           fetchTickets();
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [fetchTickets]);

  const addFiles = (selectedFiles: File[]) => {
    const invalidFiles = selectedFiles.filter(file => file.type.startsWith("video/") || file.type.startsWith("audio/"));
    if (invalidFiles.length > 0) {
      toast({
        variant: "destructive",
        title: "Arquivo não permitido",
        description: "Não é permitido anexar vídeos ou áudios.",
      });
      return;
    }
    setFiles(prev => [...prev, ...selectedFiles]);
    setPreviews(prev => [...prev, ...selectedFiles.map(file => URL.createObjectURL(file))]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = Array.from(e.clipboardData?.files || []);
    if (pasted.length === 0) return;
    e.preventDefault();
    addFiles(pasted);
  };

  const openTicket = (ticket: TicketRow) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
  };

  // Atalhos vindos de outras telas: ?novo=1 (botão "Novo chamado" da barra
  // superior / busca rápida) e ?id=<chamado> (busca rápida e notificações).
  useEffect(() => {
    if (searchParams.get("novo") === "1") {
      setIsDialogOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("novo");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id || isFetchingTickets) return;
    const found = tickets.find((t) => t.id === id);
    if (found) openTicket(found);
    else toast({ variant: "destructive", title: "Chamado não encontrado", description: "Ele pode ter sido excluído ou você não tem acesso a ele." });
    const next = new URLSearchParams(searchParams);
    next.delete("id");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isFetchingTickets, tickets]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Usuário não autenticado. Por favor, faça login novamente.");

      const uploadedUrls = [];
      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("chamados_anexos")
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("chamados_anexos")
          .getPublicUrl(filePath);
          
        uploadedUrls.push(publicUrl);
      }

         // status/status_id não precisam ser resolvidos aqui: o gatilho
         // sync_legacy_status_from_status_id no banco atribui automaticamente
         // o status configurado como inicial quando nenhum é informado.
         const insertData: any = {
           titulo: newTicket.titulo || "Sem título",
           descricao: newTicket.descricao,
           prioridade_id: newTicket.prioridade_id,
           usuario_id: user.id,
           department_id: userProfile?.department_id,
           anexos: uploadedUrls.length > 0 ? uploadedUrls : null,
         };
         if (newTicket.tecnico_id && newTicket.tecnico_id !== "none") {
           insertData.tecnico_id = newTicket.tecnico_id;
         }

         if (canRetroactive) {
           if (retroativo.ativarSuspensao && !retroativo.ativarInicio) {
             throw new Error("Para registrar uma suspensão retroativa, informe também o início de atendimento retroativo.");
           }
           if (retroativo.ativarAbertura && retroativo.dataAbertura) {
             insertData.gerado_em = new Date(retroativo.dataAbertura).toISOString();
           }
           if (retroativo.ativarInicio && retroativo.dataInicio) {
             if (retroativo.ativarAbertura && retroativo.dataAbertura && retroativo.dataInicio < retroativo.dataAbertura) {
               throw new Error("O início do atendimento retroativo não pode ser anterior à data de abertura.");
             }
             insertData.atendido_em = new Date(retroativo.dataInicio).toISOString();
             const emAtendimentoId = getStatusIdByLegacyEnum("EM_ATENDIMENTO");
             if (emAtendimentoId) insertData.status_id = emAtendimentoId;
           }
           if (retroativo.ativarSuspensao && retroativo.dataSuspensao) {
             if (retroativo.dataSuspensao < retroativo.dataInicio) {
               throw new Error("A suspensão retroativa não pode ser anterior ao início do atendimento.");
             }
             insertData.pausado_em = new Date(retroativo.dataSuspensao).toISOString();
             const pausaId = getStatusIdByFlag("is_pausa");
             if (pausaId) insertData.status_id = pausaId;
           }
         }

        const { data: insertedTicket, error: insertError } = await supabase
          .from("chamados")
          .insert(insertData)
          .select()
          .single();

      if (insertError) throw insertError;

       toast({ title: "Sucesso", description: "Chamado criado com sucesso!" });
 
       // Send email notification
       if (insertedTicket) {
          import("@/utils/email").then(({ sendTemplatedEmail }) => {
            sendTemplatedEmail(user.email!, "new_ticket", {
              user: `${userProfile?.nome ?? ""} ${userProfile?.sobrenome ?? ""}`.trim() || user.email!,
              os: insertedTicket.os || "",
              titulo: insertedTicket.titulo,
              descricao: insertedTicket.descricao,
              status: "ABERTO"
            });
          });
       }
      await fetchTickets();
      setIsDialogOpen(false);
      setNewTicket({
        titulo: "",
        descricao: "",
        prioridade_id: priorities[0]?.id || "",
        tecnico_id: "none"
      });
      setFiles([]);
      setPreviews([]);
      setRetroativo({
        ativarAbertura: false,
        dataAbertura: "",
        ativarInicio: false,
        dataInicio: "",
        ativarSuspensao: false,
        dataSuspensao: "",
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao criar chamado", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const role = userProfile ? (userProfile.is_master ? "MASTER" : userProfile.regra) : null;
  // Mesmo padrão do detalhe/Kanban (ver CLAUDE.md): piso histórico do papel OU
  // permissão granular — o toggle de Permissões só pode ampliar.
  const isTecnicoOuAcima = !!role && role !== "USUARIO";
  const canAtender = isTecnicoOuAcima || hasPermission("chamados:assumir_chamado");
  const canEncerrar = isTecnicoOuAcima || hasPermission("chamados:encerrar");
  const canReabrir = isTecnicoOuAcima || hasPermission("chamados:reabrir");

  const isOpenTicket = (t: TicketRow) => {
    const st = getStatusRow(t);
    return !st?.is_encerrado && !st?.is_cancelado;
  };

  const term = searchTerm.trim().toLowerCase();
  const baseFiltered = tickets.filter((t) => {
    const interacoes = Array.isArray(t.interacoes)
      ? t.interacoes.map((c: any) => (c?.comentario || "").toLowerCase()).join(" ")
      : "";
    const matchesSearch =
      !term ||
      (t.titulo || "").toLowerCase().includes(term) ||
      (t.os || "").toLowerCase().includes(term) ||
      (t.descricao || "").toLowerCase().includes(term) ||
      interacoes.includes(term);
    const matchesStatus = statusFilter === "todos" || t.status_id === statusFilter || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const viewTabs: { key: string; label: string; match: (t: TicketRow) => boolean; alert?: boolean }[] = [
    { key: "todos", label: "Todos", match: () => true },
    { key: "meus", label: "Abertos por mim", match: (t) => t.usuario_id === currentUserId },
    { key: "designados", label: "Atribuídos a mim", match: (t) => t.tecnico_id === currentUserId },
    { key: "sem_responsavel", label: "Sem responsável", match: (t) => !t.tecnico_id && isOpenTicket(t) },
    {
      key: "sla_risco",
      label: "SLA em risco",
      alert: true,
      match: (t) => {
        const s = getSlaInfo(t, getStatusRow(t)).state;
        return s === "bad" || s === "warn";
      },
    },
  ];
  const activeView = viewTabs.find((v) => v.key === viewFilter) || viewTabs[0];
  const filteredTickets = baseFiltered.filter(activeView.match);
  const overdueCount = tickets.filter((t) => getSlaInfo(t, getStatusRow(t)).state === "bad").length;

  const listColumns: ColumnDef[] = [
    { key: "chamado", label: "Chamado" },
    { key: "status", label: "Status" },
    { key: "prioridade", label: "Prioridade" },
    { key: "sla", label: "SLA" },
    { key: "solicitante", label: "Solicitante" },
    { key: "responsavel", label: "Responsável" },
    { key: "descricao", label: "Descrição" },
    { key: "anexos", label: "Anexos" },
    { key: "criado_em", label: "Aberto em" },
    { key: "finalizado_em", label: "Finalizado em" },
  ];
  const { isVisible: isColVisible, toggle: toggleColumn } = useColumnVisibility(
    listColumns.map((c) => c.key),
    ["descricao", "anexos", "finalizado_em"]
  );
  const getListSortValue = useCallback((t: TicketRow, key: string) => {
    switch (key) {
      case "chamado": return t.titulo || t.os || "";
      case "descricao": return t.descricao || "";
      case "sla": return getSlaInfo(t, getStatusRow(t)).rank;
      case "status": return getLabel(t);
      case "prioridade": return t.prioridade_obj?.ordem ?? t.prioridade ?? "";
      case "solicitante": return t.usuario ? `${t.usuario.nome} ${t.usuario.sobrenome || ""}` : "";
      case "responsavel": return t.tecnico ? `${t.tecnico.nome} ${t.tecnico.sobrenome || ""}` : "";
      case "anexos": return t.anexos?.length || 0;
      case "criado_em": return t.gerado_em ? new Date(t.gerado_em).getTime() : null;
      case "finalizado_em": return t.encerrado_em ? new Date(t.encerrado_em).getTime() : null;
      default: return "";
    }
  }, [getStatusRow, getLabel]);
  const { sortedData: sortedTickets, sortKey: listSortKey, sortDirection: listSortDirection, requestSort: requestListSort } = useSortableTable(filteredTickets, getListSortValue);

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedTickets.length && sortedTickets.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedTickets.map((t) => t.id)));
    }
  };

  const selectedPriority = priorities.find((p) => p.id === newTicket.prioridade_id);
  const retroActiveCount = [retroativo.ativarAbertura, retroativo.ativarInicio, retroativo.ativarSuspensao].filter(Boolean).length;

  return (
    <div className="p-4 md:p-8 w-full md:h-full flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chamados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tickets.length} {tickets.length === 1 ? "chamado" : "chamados"} no total
            {overdueCount > 0 && (
              <>
                {" · "}
                <button type="button" onClick={() => setViewFilter("sla_risco")} className="font-semibold text-destructive hover:underline">
                  {overdueCount} com SLA vencido
                </button>
              </>
            )}
          </p>
        </div>
        <div className="inline-flex p-1 rounded-xl border bg-muted/60 self-start sm:self-auto">
          {([
            ["list", "Lista", List],
            ["kanban", "Kanban", LayoutGrid],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setViewMode(key)}
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold transition-all",
                viewMode === key ? "bg-card text-foreground shadow-soft border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Visões rápidas */}
      <div className="flex gap-1 border-b overflow-x-auto shrink-0 -mx-4 px-4 md:mx-0 md:px-0">
        {viewTabs.map((v) => {
          const count = baseFiltered.filter(v.match).length;
          const on = activeView.key === v.key;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => setViewFilter(v.key)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors",
                on ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {v.alert && <AlertTriangle size={14} className="text-destructive" />}
              {v.label}
              <span
                className={cn(
                  "text-[11px] px-1.5 rounded-full border",
                  on ? "bg-accent text-accent-foreground border-primary/20" : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
          <Input
            placeholder="Filtrar por OS, título, descrição…"
            className="pl-9 h-8 text-[13px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className={cn(
              "h-8 w-auto gap-2 rounded-lg text-[12.5px] font-medium",
              statusFilter !== "todos" ? "bg-accent text-accent-foreground border-primary/20" : "border-dashed text-muted-foreground"
            )}
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.cor }} />
                  {s.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(statusFilter !== "todos" || searchTerm) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("todos"); setSearchTerm(""); }}>
            <X size={14} /> Limpar filtros
          </Button>
        )}
        {canBulkDelete && viewMode === "kanban" && (
          <span className="text-xs text-muted-foreground ml-auto hidden lg:inline">
            Marque os cards para excluir vários de uma vez.
          </span>
        )}
      </div>

      {isFetchingTickets ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : viewMode === "list" ? (
        <div className="bg-card rounded-xl border shadow-soft overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {canBulkDelete && (
                  <TableHead className="w-10 px-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))] cursor-pointer align-middle"
                      checked={sortedTickets.length > 0 && selectedIds.size === sortedTickets.length}
                      onChange={toggleSelectAll}
                      aria-label="Selecionar todos os chamados"
                    />
                  </TableHead>
                )}
                {isColVisible("chamado") && <SortableTableHead label="Chamado" sortKey="chamado" currentSortKey={listSortKey} direction={listSortDirection} onSort={requestListSort} />}
                {isColVisible("status") && <SortableTableHead label="Status" sortKey="status" currentSortKey={listSortKey} direction={listSortDirection} onSort={requestListSort} />}
                {isColVisible("prioridade") && <SortableTableHead label="Prioridade" sortKey="prioridade" currentSortKey={listSortKey} direction={listSortDirection} onSort={requestListSort} />}
                {isColVisible("sla") && <SortableTableHead label="SLA" sortKey="sla" currentSortKey={listSortKey} direction={listSortDirection} onSort={requestListSort} />}
                {isColVisible("solicitante") && <SortableTableHead label="Solicitante" sortKey="solicitante" currentSortKey={listSortKey} direction={listSortDirection} onSort={requestListSort} />}
                {isColVisible("responsavel") && <SortableTableHead label="Responsável" sortKey="responsavel" currentSortKey={listSortKey} direction={listSortDirection} onSort={requestListSort} />}
                {isColVisible("descricao") && <SortableTableHead label="Descrição" sortKey="descricao" currentSortKey={listSortKey} direction={listSortDirection} onSort={requestListSort} />}
                {isColVisible("anexos") && <SortableTableHead label="Anexos" sortKey="anexos" currentSortKey={listSortKey} direction={listSortDirection} onSort={requestListSort} />}
                {isColVisible("criado_em") && <SortableTableHead label="Aberto em" sortKey="criado_em" currentSortKey={listSortKey} direction={listSortDirection} onSort={requestListSort} />}
                {isColVisible("finalizado_em") && <SortableTableHead label="Finalizado em" sortKey="finalizado_em" currentSortKey={listSortKey} direction={listSortDirection} onSort={requestListSort} />}
                <TableHead className="w-24 text-right">
                  <ColumnVisibilityMenu columns={listColumns} isVisible={isColVisible} onToggle={toggleColumn} />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTickets.map((ticket) => {
                const st = getStatusRow(ticket);
                const selected = selectedIds.has(ticket.id);
                const comments = ticket.comentarios_chamado?.[0]?.count || 0;
                return (
                  <TableRow
                    key={ticket.id}
                    data-state={selected ? "selected" : undefined}
                    className="group cursor-pointer data-[state=selected]:bg-accent/40"
                    onClick={() => openTicket(ticket)}
                  >
                    {canBulkDelete && (
                      <TableCell className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))] cursor-pointer align-middle"
                          checked={selected}
                          onChange={() => toggleSelectOne(ticket.id)}
                          aria-label={`Selecionar chamado ${ticket.os}`}
                        />
                      </TableCell>
                    )}
                    {isColVisible("chamado") && (
                      <TableCell className="min-w-[240px]">
                        <span className="block font-semibold leading-snug">{ticket.titulo || "Sem título"}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">#{ticket.os}</span>
                          {ticket.chamado_pai && (
                            <span className="inline-flex items-center gap-1"><ArrowRight size={11} /> #{ticket.chamado_pai.os}</span>
                          )}
                          {comments > 0 && (
                            <span className="inline-flex items-center gap-1"><MessageSquare size={11} /> {comments}</span>
                          )}
                          {ticket.anexos?.length > 0 && (
                            <span className="inline-flex items-center gap-1"><Paperclip size={11} /> {ticket.anexos.length}</span>
                          )}
                          {ticket.reaberto && <span className="text-amber-600 font-semibold">Reaberto</span>}
                        </span>
                      </TableCell>
                    )}
                    {isColVisible("status") && (
                      <TableCell><StatusPill status={st} label={getLabel(ticket)} /></TableCell>
                    )}
                    {isColVisible("prioridade") && (
                      <TableCell><PriorityIndicator priority={ticket.prioridade_obj} legacy={ticket.prioridade} /></TableCell>
                    )}
                    {isColVisible("sla") && (
                      <TableCell><SlaChip ticket={ticket} status={st} /></TableCell>
                    )}
                    {isColVisible("solicitante") && (
                      <TableCell>
                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                          <UserAvatar person={ticket.usuario} size={24} />
                          <span className="font-medium">{ticket.usuario ? `${ticket.usuario.nome} ${ticket.usuario.sobrenome || ""}` : "—"}</span>
                        </span>
                      </TableCell>
                    )}
                    {isColVisible("responsavel") && (
                      <TableCell>
                        {ticket.tecnico ? (
                          <span className="inline-flex items-center gap-2 whitespace-nowrap">
                            <UserAvatar person={ticket.tecnico} size={24} />
                            <span className="font-medium">{ticket.tecnico.nome} {ticket.tecnico.sobrenome}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-muted-foreground whitespace-nowrap">
                            <span className="h-6 w-6 rounded-full border border-dashed border-input grid place-items-center"><UserPlus size={11} /></span>
                            Sem responsável
                          </span>
                        )}
                      </TableCell>
                    )}
                    {isColVisible("descricao") && (
                      <TableCell className="max-w-xs truncate text-muted-foreground">{ticket.descricao}</TableCell>
                    )}
                    {isColVisible("anexos") && (
                      <TableCell>
                        {ticket.anexos?.length > 0 ? (
                          <div className="flex gap-1.5">
                            {ticket.anexos.map((url: string, idx: number) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline text-xs font-medium">
                                Anexo {idx + 1}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    {isColVisible("criado_em") && (
                      <TableCell className="text-[13px] text-muted-foreground whitespace-nowrap" title={ticket.gerado_em ? format(new Date(ticket.gerado_em), "dd/MM/yyyy HH:mm", { locale: ptBR }) : undefined}>
                        {timeAgo(ticket.gerado_em)}
                      </TableCell>
                    )}
                    {isColVisible("finalizado_em") && (
                      <TableCell className="text-[13px] text-muted-foreground whitespace-nowrap">
                        {ticket.encerrado_em ? format(new Date(ticket.encerrado_em), "dd/MM/yy HH:mm", { locale: ptBR }) : "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {st?.is_inicial && canAtender && (
                          <RowAction title="Atender" onClick={() => runAction(ticket, "atender")}><Play size={14} /></RowAction>
                        )}
                        {st?.legacy_enum === "EM_ATENDIMENTO" && canEncerrar && (
                          <>
                            <RowAction title="Encerrar" className="text-emerald-600" onClick={() => runAction(ticket, "encerrar")}><CheckCircle size={14} /></RowAction>
                            <RowAction title="Pausar" onClick={() => runAction(ticket, "pausar")}><Pause size={14} /></RowAction>
                          </>
                        )}
                        {(st?.legacy_enum === "PAUSADO" || st?.legacy_enum === "AGUARDANDO_USUARIO") && canEncerrar && (
                          <RowAction title="Retomar" className="text-amber-600" onClick={() => runAction(ticket, "retomar")}><Play size={14} /></RowAction>
                        )}
                        {st?.is_encerrado && canReabrir && (
                          <RowAction title="Reabrir" onClick={() => runAction(ticket, "reabrir")}><RotateCcw size={14} /></RowAction>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {sortedTickets.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={listColumns.length + 2} className="py-16">
                    <EmptyState onClear={() => { setStatusFilter("todos"); setSearchTerm(""); setViewFilter("todos"); }} />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex-1 md:min-h-0 flex flex-col">
          <ChamadosKanban
            tickets={filteredTickets}
            onUpdate={fetchTickets}
            isMaster={canBulkDelete}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelectOne}
          />
        </div>
      )}

      {/* Barra de ações em massa */}
      {canBulkDelete && selectedIds.size > 0 && (
        <div className="fixed z-40 bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 md:translate-x-[calc(-50%+128px)] flex items-center gap-1.5 rounded-2xl bg-slate-900 text-white pl-4 pr-2 py-2 shadow-floating animate-in fade-in slide-in-from-bottom-4">
          <span className="text-sm font-semibold whitespace-nowrap mr-2">
            {selectedIds.size} {selectedIds.size === 1 ? "selecionado" : "selecionados"}
          </span>
          {selectedIds.size < sortedTickets.length && (
            <Button size="sm" variant="ghost" className="text-slate-200 hover:bg-white/10 hover:text-white" onClick={() => setSelectedIds(new Set(sortedTickets.map((t) => t.id)))}>
              Selecionar todos ({sortedTickets.length})
            </Button>
          )}
          <span className="w-px h-5 bg-white/15 mx-1" />
          <Button size="sm" className="bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 shadow-none" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 size={14} /> Excluir
          </Button>
          <button type="button" onClick={() => setSelectedIds(new Set())} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10" aria-label="Limpar seleção">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Novo chamado */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 max-h-[92vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-row items-center gap-3 space-y-0 px-6 py-4 border-b text-left">
            <span className="h-9 w-9 rounded-xl bg-accent text-accent-foreground grid place-items-center shrink-0"><TicketIcon size={18} /></span>
            <div>
              <DialogTitle className="text-base">Novo chamado</DialogTitle>
              <DialogDescription className="text-xs">Descreva o problema — quanto mais detalhes, mais rápido o atendimento.</DialogDescription>
            </div>
          </DialogHeader>
          <form
            id="novo-chamado-form"
            onSubmit={handleCreateTicket}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                (e.currentTarget as HTMLFormElement).requestSubmit();
              }
            }}
            className="space-y-4 px-6 py-5 overflow-y-auto custom-scrollbar"
          >
            <div className="space-y-1.5">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                required
                autoFocus
                value={newTicket.titulo}
                onChange={e => setNewTicket({ ...newTicket, titulo: e.target.value })}
                placeholder="Ex: Impressora do financeiro não imprime"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                required
                className="min-h-[110px] resize-y"
                value={newTicket.descricao}
                onChange={e => setNewTicket({ ...newTicket, descricao: e.target.value })}
                placeholder="O que aconteceu? Desde quando? Já tentou alguma coisa?"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {priorities.map((p) => {
                  const on = newTicket.prioridade_id === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setNewTicket({ ...newTicket, prioridade_id: p.id })}
                      className={cn(
                        "h-10 rounded-lg border text-[13px] font-semibold inline-flex items-center justify-center gap-2 transition-all",
                        on ? "shadow-[0_0_0_3px_var(--tw-shadow-color)]" : "hover:bg-muted"
                      )}
                      style={on ? { borderColor: p.cor, backgroundColor: `${p.cor}12`, color: p.cor, ["--tw-shadow-color" as string]: `${p.cor}26` } : undefined}
                    >
                      <PriorityIndicator priority={p} showLabel={false} />
                      {p.nome}
                    </button>
                  );
                })}
              </div>
              {selectedPriority?.sla_horas != null && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
                  <Clock size={13} /> Prazo de atendimento (SLA): {formatDuration(selectedPriority.sla_horas * 60)}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tecnico">Responsável</Label>
              {agents.length > 0 ? (
                <Select
                  value={newTicket.tecnico_id === "none" ? "" : newTicket.tecnico_id}
                  onValueChange={v => setNewTicket({ ...newTicket, tecnico_id: v })}
                >
                  <SelectTrigger id="tecnico">
                    <SelectValue placeholder="Selecione quem vai atender" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <span className="inline-flex items-center gap-2">
                          <UserAvatar person={agent} size={20} /> {agent.nome} {agent.sobrenome}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2 text-destructive text-xs">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <p>Não há atendentes ativos disponíveis. Por favor, contate o administrador.</p>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Anexos</Label>
              <label
                htmlFor="anexos"
                className="flex items-center gap-3 rounded-xl border-2 border-dashed border-input p-3 text-sm text-muted-foreground cursor-pointer hover:border-primary/40 hover:bg-accent/40 transition-colors"
              >
                <Paperclip size={17} className="shrink-0" />
                <span>
                  <span className="font-semibold text-primary">Escolha arquivos</span> ou cole um print aqui (Ctrl+V).
                  <span className="block text-[11px]">Texto, PDF e imagens. Vídeos e áudios não são permitidos.</span>
                </span>
              </label>
              <input id="anexos" type="file" multiple accept=".txt,.pdf,image/*" onChange={handleFileChange} className="sr-only" />
              {files.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                  {files.map((file, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border bg-muted grid place-items-center">
                      {file.type.startsWith("image/") ? (
                        <img src={previews[idx]} alt={file.name} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-[10px] font-semibold text-muted-foreground px-1 text-center break-all">{file.name}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute top-1 right-1 bg-slate-900/70 text-white rounded-full p-0.5"
                        aria-label={`Remover ${file.name}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {canRetroactive && (
              <div className="rounded-xl border bg-muted/40">
                <button
                  type="button"
                  onClick={() => setShowRetro((v) => !v)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold"
                >
                  <History size={15} className="text-muted-foreground" />
                  Registro retroativo
                  <span className="text-[11px] font-semibold text-accent-foreground bg-accent border border-primary/20 rounded-md px-1.5">Master</span>
                  {retroActiveCount > 0 && <span className="text-xs text-muted-foreground font-medium">· {retroActiveCount} ativo(s)</span>}
                  <ChevronDown size={16} className={cn("ml-auto text-muted-foreground transition-transform", showRetro && "rotate-180")} />
                </button>
                {showRetro && (
                  <div className="px-3 pb-3 space-y-3">
                    <div className="grid sm:grid-cols-3 gap-3">
                      <RetroField
                        id="retro-abertura"
                        label="Abertura"
                        checked={retroativo.ativarAbertura}
                        onCheckedChange={(v) => setRetroativo(prev => ({ ...prev, ativarAbertura: v }))}
                        value={retroativo.dataAbertura}
                        onValueChange={(v) => setRetroativo(prev => ({ ...prev, dataAbertura: v }))}
                      />
                      <RetroField
                        id="retro-inicio"
                        label="Início do atendimento"
                        checked={retroativo.ativarInicio}
                        onCheckedChange={(v) => setRetroativo(prev => ({ ...prev, ativarInicio: v, ativarSuspensao: v ? prev.ativarSuspensao : false }))}
                        value={retroativo.dataInicio}
                        onValueChange={(v) => setRetroativo(prev => ({ ...prev, dataInicio: v }))}
                      />
                      <RetroField
                        id="retro-suspensao"
                        label="Suspensão"
                        disabled={!retroativo.ativarInicio}
                        checked={retroativo.ativarSuspensao}
                        onCheckedChange={(v) => setRetroativo(prev => ({ ...prev, ativarSuspensao: v }))}
                        value={retroativo.dataSuspensao}
                        onValueChange={(v) => setRetroativo(prev => ({ ...prev, dataSuspensao: v }))}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Use apenas para cadastrar chamados de períodos anteriores (ex: migração de histórico). A suspensão exige o início do atendimento.
                    </p>
                  </div>
                )}
              </div>
            )}
          </form>
          <DialogFooter className="px-6 py-3.5 border-t bg-muted/40 sm:justify-between items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span className="kbd">Ctrl</span><span className="kbd">Enter</span> para enviar
            </span>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button
                type="submit"
                form="novo-chamado-form"
                disabled={isLoading || agents.length === 0 || !newTicket.tecnico_id || newTicket.tecnico_id === "none"}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={15} />}
                Abrir chamado
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChamadoDetailDialog
        ticket={selectedTicket}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdate={fetchTickets}
        userRole={userProfile?.is_master ? "MASTER" : userProfile?.regra ?? null}
        currentUserId={currentUserId}
        agents={agents}
        priorities={priorities}
      />

      {canBulkDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir {selectedIds.size} chamado(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é irreversível. Os chamados selecionados e todo o histórico de interações, ordens
                de serviço e transferências vinculados serão excluídos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
                onClick={(e) => { e.preventDefault(); handleDeleteSelected(); }}
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Excluir definitivamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function RowAction({ title, onClick, className, children }: { title: string; onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn("h-7 w-7 grid place-items-center rounded-md border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors", className)}
    >
      {children}
    </button>
  );
}

function RetroField({
  id, label, checked, onCheckedChange, value, onValueChange, disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} className="scale-90" />
        <Label htmlFor={id} className={cn("text-[13px] font-medium", disabled && "text-muted-foreground")}>{label}</Label>
      </div>
      <Input
        type="datetime-local"
        className="h-9 text-[13px]"
        disabled={!checked}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
      <span className="h-12 w-12 rounded-2xl bg-muted grid place-items-center"><Inbox size={22} /></span>
      <p className="font-semibold text-foreground">Nenhum chamado por aqui</p>
      <p className="text-sm">Nenhum chamado corresponde aos filtros atuais.</p>
      <Button variant="outline" size="sm" onClick={onClear} className="mt-1">Limpar filtros</Button>
    </div>
  );
}
