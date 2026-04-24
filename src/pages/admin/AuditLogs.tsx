import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Shield, User, Calendar, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AuditLogs = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      LOGIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      LOGOUT: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    };

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[action] || "bg-gray-100 text-gray-800"}`}>
        {action}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Shield className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logs de Auditoria</h1>
          <p className="text-muted-foreground text-sm">Acompanhe todas as ações realizadas no sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Ações</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Últimos 100 registros</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Data e Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Recurso</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">Carregando logs...</TableCell>
                </TableRow>
              ) : logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">Nenhum log encontrado</TableCell>
                </TableRow>
              ) : (
                logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-3 text-muted-foreground" />
                        {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="size-3 text-muted-foreground" />
                        <span className="truncate max-w-[150px]" title={log.user_email}>
                          {log.user_email || "Sistema"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {log.table_name || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="text-xs text-muted-foreground truncate">
                        {log.action === 'UPDATE' ? (
                          `Alterou registro ${log.record_id}`
                        ) : log.action === 'CREATE' ? (
                          `Criou novo registro em ${log.table_name}`
                        ) : log.action === 'DELETE' ? (
                          `Removeu registro ${log.record_id}`
                        ) : (
                          `Ação: ${log.action}`
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
