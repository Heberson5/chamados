import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Play, CheckCircle, Clock, AlertTriangle, User, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChamadosKanbanProps {
  tickets: any[];
  onUpdate: () => void;
}

export default function ChamadosKanban({ tickets, onUpdate }: ChamadosKanbanProps) {
  const { toast } = useToast();

  const columns = [
    { id: "ABERTO", title: "Abertos", color: "bg-blue-500/10 border-blue-500/20" },
    { id: "EM_ATENDIMENTO", title: "Em Atendimento", color: "bg-amber-500/10 border-amber-500/20" },
    { id: "ENCERRADO", title: "Encerrados", color: "bg-emerald-500/10 border-emerald-500/20" },
  ];

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
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[600px]">
      {columns.map((column) => (
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
                        {ticket.prioridade}
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
                  <CardFooter className="p-4 pt-0">
                    {column.id === "ABERTO" && (
                      <Button 
                        size="sm" 
                        className="w-full gap-2 text-xs h-8"
                        onClick={() => handleAction(ticket.id, "atender")}
                      >
                        <Play size={14} /> Atender
                      </Button>
                    )}
                    {column.id === "EM_ATENDIMENTO" && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full gap-2 text-xs h-8 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        onClick={() => handleAction(ticket.id, "encerrar")}
                      >
                        <CheckCircle size={14} /> Encerrar
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
  );
}