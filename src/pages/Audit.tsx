 import { useState, useEffect, useMemo } from "react";
 import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
import { Search, History, MousePointer2, User as UserIcon, RefreshCw, Eye, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
  import { usePermissions } from "@/hooks/usePermissions";
  import { useNavigate } from "react-router-dom";
 import { ptBR } from "date-fns/locale";
 import { useSortableTable, useColumnVisibility } from "@/hooks/useSortableTable";
 import { SortableTableHead } from "@/components/SortableTableHead";
 import { ColumnVisibilityMenu, type ColumnDef } from "@/components/ColumnVisibilityMenu";

  export default function Audit() {
    const navigate = useNavigate();
    const { hasPermission, loading: permsLoading } = usePermissions();

    useEffect(() => {
      if (!permsLoading && !hasPermission("audit")) {
        navigate("/dashboard");
      }
    }, [permsLoading, hasPermission, navigate]);

    const [logs, setLogs] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<any>(null);

    const todayStr = useMemo(() => {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }, []);
    const [dateFrom, setDateFrom] = useState<string>(todayStr);
    const [dateTo, setDateTo] = useState<string>(todayStr);
 
    const fetchLogs = async () => {
      setIsLoading(true);
      const from = dateFrom || todayStr;
      const to = dateTo || todayStr;
      const startISO = new Date(`${from}T00:00:00`).toISOString();
      const endISO = new Date(`${to}T23:59:59.999`).toISOString();
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching logs:", error);
        setLogs([]);
        setIsLoading(false);
        return;
      }

      let enriched = data || [];
      const authIds = Array.from(
        new Set(
          enriched
            .map((l: any) => l.auth_user_id)
            .filter((v: any) => !!v)
        )
      );
      if (authIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, nome, sobrenome, avatar_url")
          .in("user_id", authIds as string[]);
        const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
        enriched = enriched.map((l: any) => ({
          ...l,
          profiles: l.auth_user_id ? map.get(l.auth_user_id) || null : null,
        }));
      }

      // Enrich each mutation log (INSERT/UPDATE/DELETE) with the id_numerico of the affected record
      const mutationActions = new Set(["INSERT", "UPDATE", "DELETE"]);
      const byTable = new Map<string, Set<string>>();
      for (const l of enriched) {
        if (mutationActions.has(l.action) && l.table_name && l.record_id) {
          if (!byTable.has(l.table_name)) byTable.set(l.table_name, new Set());
          byTable.get(l.table_name)!.add(String(l.record_id));
        }
      }

      const recordIdMap = new Map<string, any>(); // key: `${table}:${record_id}` -> id_numerico
      await Promise.all(
        Array.from(byTable.entries()).map(async ([table, idsSet]) => {
          const ids = Array.from(idsSet);
          try {
            const { data: rows, error: tErr } = await (supabase as any)
              .from(table)
              .select("id, id_numerico")
              .in("id", ids);
            if (tErr || !rows) return;
            for (const r of rows) {
              recordIdMap.set(`${table}:${r.id}`, r.id_numerico);
            }
          } catch (e) {
            // table without id column or inaccessible — try fallback from old/new data later
          }
        })
      );

      enriched = enriched.map((l: any) => {
        let recordIdNumerico: any = null;
        if (mutationActions.has(l.action) && l.table_name && l.record_id) {
          recordIdNumerico = recordIdMap.get(`${l.table_name}:${l.record_id}`) ?? null;
          // Fallback: try to read id_numerico from new_data/old_data snapshot
          if (recordIdNumerico == null) {
            recordIdNumerico =
              l.new_data?.id_numerico ?? l.old_data?.id_numerico ?? null;
          }
        }
        return { ...l, record_id_numerico: recordIdNumerico };
      });

      setLogs(enriched);
      setIsLoading(false);
    };

    useEffect(() => {
      fetchLogs();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFrom, dateTo]);

    const applyPreset = (days: number) => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - (days - 1));
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      setDateFrom(fmt(start));
      setDateTo(fmt(end));
    };
 
    const filteredLogs = logs.filter(log => {
      const userName = log.profiles 
        ? `${log.profiles.nome} ${log.profiles.sobrenome}` 
        : (log.user_email || "Sistema");
      
      const search = searchTerm.toLowerCase();
      return userName.toLowerCase().includes(search) ||
             (log.action?.toLowerCase() || "").includes(search) ||
             (log.table_name?.toLowerCase() || "").includes(search);
    });

    const translateAction = (action: string) => {
      const translations: Record<string, string> = {
        'INSERT': 'CRIAR',
        'UPDATE': 'EDITAR',
        'DELETE': 'EXCLUIR',
        'LOGIN': 'LOGIN',
        'LOGOUT': 'LOGOUT',
        'VIEW': 'VISUALIZAR'
      };
      return translations[action] || action;
    };

    const TABLE_LABELS: Record<string, string> = {
      chamados: "Chamados",
      comentarios_chamado: "Interações do Chamado",
      transferencias_chamado: "Transferências de Chamado",
      chamados_prioridades: "Prioridades de Chamado",
      profiles: "Usuários",
      user_roles: "Funções de Usuário",
      role_definitions: "Permissões",
      departamentos: "Departamentos",
      categorias: "Categorias",
      organizations: "Organizações",
      notificacoes: "Notificações",
      email_logs: "Registros de E-mail",
      audit_logs: "Logs de Auditoria",
      help_menu_manuals: "Manuais de Ajuda",
      system_manuals: "Manuais do Sistema",
      system_settings: "Configurações do Sistema",
      password_history: "Histórico de Senhas",
      expedientes: "Expedientes",
      fornecedores: "Fornecedores",
      itens_inventario: "Itens de Inventário",
      movimentacoes_estoque: "Movimentações de Estoque",
      estoque_setor: "Estoque por Setor",
      baixas: "Baixas",
      itens_baixa: "Itens de Baixa",
      solicitacoes_compra: "Solicitações de Compra",
      itens_solicitacao_compra: "Itens de Solicitação de Compra",
      reembolsos: "Reembolsos",
      servicos: "Serviços",
      ordens_de_servico: "Ordens de Serviço",
    };

    const PATH_LABELS: Record<string, string> = {
      "/dashboard": "Painel",
      "/chamados": "Chamados",
      "/acompanhamento": "Acompanhamento",
      "/reports": "Relatórios",
      "/usuarios": "Usuários",
      "/departamentos": "Departamentos",
      "/permissions": "Permissões",
      "/audit": "Auditoria",
      "/ajuda": "Ajuda",
      "/settings": "Configurações",
      "/configuracoes/senhas": "Política de Senhas",
      "/perfil": "Perfil",
      "/login": "Login",
    };

    const translateTable = (name?: string | null) => {
      if (!name) return "-";
      return TABLE_LABELS[name] || name;
    };
    const translatePath = (path?: string | null) => {
      if (!path) return "-";
      return PATH_LABELS[path] || path;
    };

    const formatCuiabaTime = (date: string) => {
      if (!date) return "-";
      try {
        const d = parseISO(date);
        // The date is already in UTC from Supabase, parseISO handles the offset if present
        // but since it's displayed in the browser, it will use the browser's timezone.
        // If the user specifically wants Cuiabá time, they might need an explicit offset, 
        // but standard practice is to show browser local time or UTC.
        return format(d, "dd/MM/yy HH:mm:ss", { locale: ptBR });
      } catch (e) {
        return date;
      }
    };

    const listColumns: ColumnDef[] = [
      { key: "id", label: "#" },
      { key: "usuario", label: "Usuário / E-mail" },
      { key: "acao", label: "Ação" },
      { key: "local", label: "Local / Tabela" },
      { key: "registro_id", label: "ID Registro" },
      { key: "data", label: "Data/Hora" },
    ];
    const { isVisible: isColVisible, toggle: toggleColumn } = useColumnVisibility(listColumns.map(c => c.key));
    const getSortValue = (log: any, key: string) => {
      switch (key) {
        case "id": return log.id ?? "";
        case "usuario": return log.profiles ? `${log.profiles.nome} ${log.profiles.sobrenome}` : (log.user_email || "Sistema");
        case "acao": return translateAction(log.action);
        case "local": return log.path ? translatePath(log.path) : translateTable(log.table_name);
        case "registro_id": return ["INSERT", "UPDATE", "DELETE"].includes(log.action) ? (log.record_id_numerico ?? 0) : 0;
        case "data": return log.created_at ? new Date(log.created_at).getTime() : null;
        default: return "";
      }
    };
    const { sortedData: sortedLogs, sortKey, sortDirection, requestSort } = useSortableTable(filteredLogs, getSortValue);

   return (
     <div className="p-4 md:p-8 w-full space-y-6">
       <div>
         <h1 className="text-3xl font-bold tracking-tight">Auditoria do Sistema</h1>
         <p className="text-muted-foreground">Monitore as ações e a navegação de todos os usuários cadastrados.</p>
       </div>
 
        <Card>
          <CardContent className="p-4 flex flex-col lg:flex-row lg:items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value || todayStr)}
                className="w-[160px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value || todayStr)}
                className="w-[160px]"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => { setDateFrom(todayStr); setDateTo(todayStr); }}>Hoje</Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset(7)}>7 dias</Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset(30)}>30 dias</Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
            <div className="relative flex-1 min-w-[220px] lg:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Buscar por e-mail, ação ou tabela..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
 
       <Card>
         <CardHeader>
           <CardTitle className="text-lg flex items-center gap-2">
             <History className="w-5 h-5 text-primary" />
             Logs de Atividade
           </CardTitle>
         </CardHeader>
         <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
          <>
          <div className="flex justify-start mb-2">
            <ColumnVisibilityMenu columns={listColumns} isVisible={isColVisible} onToggle={toggleColumn} />
          </div>
          <div className="overflow-x-auto -mx-6">
            <div className="min-w-[800px] px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                  {isColVisible("id") && <SortableTableHead label="#" sortKey="id" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} className="w-16" />}
                  {isColVisible("usuario") && <SortableTableHead label="Usuário / E-mail" sortKey="usuario" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                    {isColVisible("acao") && <SortableTableHead label="Ação" sortKey="acao" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                    {isColVisible("local") && <SortableTableHead label="Local / Tabela" sortKey="local" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                    {isColVisible("registro_id") && <SortableTableHead label="ID Registro" sortKey="registro_id" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                    {isColVisible("data") && <SortableTableHead label="Data/Hora" sortKey="data" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {sortedLogs.map((log) => (
                  <TableRow key={log.id}>
                      {isColVisible("id") && <TableCell className="text-xs font-mono text-muted-foreground">
                        {log.id}
                      </TableCell>}
                      {isColVisible("usuario") && <TableCell className="font-medium text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden border shrink-0">
                              {log.profiles?.avatar_url ? (
                                <img src={log.profiles.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                              ) : (
                                <UserIcon size={12} />
                              )}
                            </div>
                            <div className="flex flex-col">
                            <span className="truncate max-w-[150px]">{log.profiles ? `${log.profiles.nome} ${log.profiles.sobrenome}` : (log.user_email || 'Sistema')}</span>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{log.user_email}</span>
                            </div>
                          </div>
                        </TableCell>}
                      {isColVisible("acao") && <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.action === 'INSERT' ? 'bg-green-100 text-green-700' :
                          log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                          log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                           {translateAction(log.action)}
                        </span>
                      </TableCell>}
                      {isColVisible("local") && <TableCell className="text-xs">
                        {log.path ? (
                          <div className="flex items-center gap-1">
                            <MousePointer2 size={10} />
                            <span className="truncate max-w-[200px]">{translatePath(log.path)}</span>
                          </div>
                        ) : (
                          <span className="truncate max-w-[150px]">{translateTable(log.table_name)}</span>
                        )}
                      </TableCell>}
                      {isColVisible("registro_id") && <TableCell className="text-[10px] font-mono text-muted-foreground">
                        {["INSERT","UPDATE","DELETE"].includes(log.action)
                          ? (log.record_id_numerico ?? "-")
                          : "-"}
                      </TableCell>}
                      {isColVisible("data") && <TableCell className="text-xs whitespace-nowrap">
                        {formatCuiabaTime(log.created_at)}
                      </TableCell>}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={listColumns.filter(c => isColVisible(c.key)).length + 1} className="text-center py-8 text-muted-foreground">
                        Nenhum log encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          </>
          )}
         </CardContent>
        </Card>

        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Atividade #{selectedLog?.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-bold text-muted-foreground uppercase text-[10px]">Tabela</p>
                  <p>{selectedLog?.table_name}</p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground uppercase text-[10px]">Ação</p>
                  <p>{selectedLog?.action}</p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground uppercase text-[10px]">Usuário</p>
                  <p>{selectedLog?.user_email || "Sistema"}</p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground uppercase text-[10px]">Data/Hora</p>
                  <p>{selectedLog && formatCuiabaTime(selectedLog.created_at)}</p>
                </div>
              </div>
              
              {selectedLog?.old_data && Object.keys(selectedLog.old_data).length > 0 && (
                <div className="space-y-2">
                  <p className="font-bold text-muted-foreground uppercase text-[10px]">Dados Anteriores</p>
                  <pre className="bg-muted p-3 rounded-md text-[10px] overflow-x-auto">
                    {JSON.stringify(selectedLog.old_data, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedLog?.new_data && Object.keys(selectedLog.new_data).length > 0 && (
                <div className="space-y-2">
                  <p className="font-bold text-muted-foreground uppercase text-[10px]">Novos Dados</p>
                  <pre className="bg-muted p-3 rounded-md text-[10px] overflow-x-auto border-l-4 border-green-500">
                    {JSON.stringify(selectedLog.new_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }