import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Play, CheckCircle, Clock, AlertTriangle, User, Eye, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
 import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

   const handleAction = async (ticketId: string, action: "atender" | "encerrar") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates: any = {};
      if (action === "atender") {
        updates.status = "EM_ATENDIMENTO";
        updates.tecnico_id = user.id;
      } else if (action === "encerrar") {
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

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[calc(100vh-300px)] pr-2 custom-scrollbar">
            {tickets
              .filter((t) => t.status === column.id)
              .map((ticket) => (
                <Card key={ticket.id} className="shadow-sm hover:shadow-md transition-shadow cursor-default border-slate-200 dark:border-slate-800">
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
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <User size={12} />
                        <span className="truncate">{ticket.usuario?.nome} {ticket.usuario?.sobrenome}</span>
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
                      onClick={() => openDetails(ticket)}
                    >
                      <Eye size={12} /> Detalhes
                    </Button>
                    {column.id === "ABERTO" && userRole !== "USUARIO" && (
                      <Button 
                        size="sm" 
                        className="flex-1 gap-2 text-[10px] h-8"
                        onClick={() => handleAction(ticket.id, "atender")}
                      >
                        <Play size={12} /> Atender
                      </Button>
                    )}
                    {column.id === "EM_ATENDIMENTO" && userRole !== "USUARIO" && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 gap-2 text-[10px] h-8 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        onClick={() => openClosureDialog(ticket)}
                      >
                        <CheckCircle size={12} /> Encerrar
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            
            {tickets.filter(t => t.status === column.id).length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50 border-2 border-dashed rounded-lg">
                <AlertTriangle size={24} className="mb-2 opacity-20" />
                <p className="text-xs">Nenhum chamado</p>
              </div>
            )}
          </div>
        </div>
      ))}
      </div>

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedTicket?.titulo}
            <Badge variant="outline">{selectedTicket?.os}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Solicitante</Label>
              <p className="text-sm font-medium">{selectedTicket?.usuario?.nome} {selectedTicket?.usuario?.sobrenome}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Aberto em</Label>
              <p className="text-sm font-medium">
                {selectedTicket?.gerado_em && format(new Date(selectedTicket.gerado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Descrição do Problema</Label>
            <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
              {selectedTicket?.descricao}
            </div>
          </div>

          {selectedTicket?.anexos && selectedTicket.anexos.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Anexos</Label>
              <div className="flex flex-wrap gap-2">
                {selectedTicket.anexos.map((url: string, idx: number) => (
                  <a 
                    key={idx} 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted transition-colors text-xs"
                  >
                    <FileText size={14} className="text-blue-500" />
                    Anexo {idx + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {selectedTicket?.status === "ENCERRADO" && selectedTicket?.descricao_encerramento && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Resolução</Label>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-md text-sm whitespace-pre-wrap">
                {selectedTicket.descricao_encerramento}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => setIsDetailsOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}