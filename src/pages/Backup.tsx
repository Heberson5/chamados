import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Navigate } from "react-router-dom";
import { Download, Upload, Loader2, RefreshCw, Database } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSortableTable, useColumnVisibility } from "@/hooks/useSortableTable";
import { SortableTableHead } from "@/components/SortableTableHead";
import { ColumnVisibilityMenu, type ColumnDef } from "@/components/ColumnVisibilityMenu";

export default function Backup() {
  const { isMaster, loading } = usePermissions();
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [busy, setBusy] = useState<"" | "export" | "import">("");
  const [file, setFile] = useState<File | null>(null);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase.from("backup_logs")
      .select("*").order("iniciado_em", { ascending: false }).limit(50);
    if (data) setLogs(data);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const logColumns: ColumnDef[] = [
    { key: "tipo", label: "Tipo" },
    { key: "status", label: "Status" },
    { key: "iniciado", label: "Iniciado" },
    { key: "finalizado", label: "Finalizado" },
    { key: "registros", label: "Registros" },
    { key: "tamanho", label: "Tamanho" },
    { key: "usuario", label: "Usuário" },
    { key: "erro", label: "Erro" },
  ];
  const { isVisible: isColVisible, toggle: toggleColumn } = useColumnVisibility(logColumns.map(c => c.key));
  const getLogSortValue = (l: any, key: string) => {
    switch (key) {
      case "tipo": return l.tipo || "";
      case "status": return l.status || "";
      case "iniciado": return l.iniciado_em ? new Date(l.iniciado_em).getTime() : null;
      case "finalizado": return l.finalizado_em ? new Date(l.finalizado_em).getTime() : null;
      case "registros": return l.total_registros ?? 0;
      case "tamanho": return l.tamanho_bytes ?? 0;
      case "usuario": return l.usuario_email || "";
      case "erro": return l.erro || "";
      default: return "";
    }
  };
  const { sortedData: sortedLogs, sortKey, sortDirection, requestSort } = useSortableTable(logs, getLogSortValue);

  if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;
  if (!isMaster) return <Navigate to="/unauthorized" replace />;

  const handleExport = async () => {
    setBusy("export");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backup-export`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `backup-${new Date().toISOString().slice(0, 19)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: "Backup gerado", description: "Download iniciado." });
      fetchLogs();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setBusy("");
    }
  };

  const handleImport = async (dryRun: boolean) => {
    if (!file) {
      toast({ variant: "destructive", title: "Selecione um arquivo .json" });
      return;
    }
    setBusy("import");
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backup-import`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tables: payload.tables || payload, dry_run: dryRun }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      toast({
        title: dryRun ? "Simulação concluída" : "Importação concluída",
        description: `${json.total} registros processados`,
      });
      fetchLogs();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Backup do Banco</h1>
        <p className="text-muted-foreground">Exporte, importe e monitore os backups. Acesso restrito ao usuário Master.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download size={18} /> Exportar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Gera um arquivo <code>.json</code> com todas as tabelas do sistema. Pode ser importado em qualquer instância compatível.
            </p>
            <Button onClick={handleExport} disabled={busy !== ""} className="gap-2">
              {busy === "export" ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              Exportar tudo (.json)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload size={18} /> Importar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Arquivo .json</Label>
            <Input type="file" accept="application/json,.json" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleImport(true)} disabled={busy !== "" || !file}>
                {busy === "import" ? <Loader2 className="animate-spin" size={16} /> : null}
                Simular (dry-run)
              </Button>
              <Button onClick={() => handleImport(false)} disabled={busy !== "" || !file}>
                {busy === "import" ? <Loader2 className="animate-spin mr-2" size={16} /> : <Upload size={16} className="mr-2" />}
                Importar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A importação faz upsert por <code>id</code>. Registros existentes serão sobrescritos.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database size={18} /> Localização do banco</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>
            Instância atual: <code className="text-foreground">{import.meta.env.VITE_SUPABASE_URL || "não configurada"}</code>
          </p>
          <p>
            Banco de dados PostgreSQL (Supabase). A troca para outra instância — como uma VPS própria com Supabase
            self-hosted — não é feita nesta tela: é preciso apontar as variáveis <code>VITE_SUPABASE_URL</code> e{" "}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> (arquivo <code>.env</code>) para o novo host, aplicar as
            migrations em <code>supabase/migrations</code> e publicar as edge functions lá. Depois disso, use o
            Exportar acima na instância atual e Importar nesta mesma tela já apontando para o novo destino.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Log e status</CardTitle>
          <Button size="sm" variant="ghost" onClick={fetchLogs}><RefreshCw size={14} /></Button>
        </CardHeader>
        <CardContent>
          <div className="flex justify-start mb-2">
            <ColumnVisibilityMenu columns={logColumns} isVisible={isColVisible} onToggle={toggleColumn} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                {isColVisible("tipo") && <SortableTableHead label="Tipo" sortKey="tipo" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                {isColVisible("status") && <SortableTableHead label="Status" sortKey="status" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                {isColVisible("iniciado") && <SortableTableHead label="Iniciado" sortKey="iniciado" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                {isColVisible("finalizado") && <SortableTableHead label="Finalizado" sortKey="finalizado" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                {isColVisible("registros") && <SortableTableHead label="Registros" sortKey="registros" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                {isColVisible("tamanho") && <SortableTableHead label="Tamanho" sortKey="tamanho" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                {isColVisible("usuario") && <SortableTableHead label="Usuário" sortKey="usuario" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                {isColVisible("erro") && <SortableTableHead label="Erro" sortKey="erro" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLogs.map((l) => (
                <TableRow key={l.id}>
                  {isColVisible("tipo") && <TableCell><Badge variant="outline">{l.tipo}</Badge></TableCell>}
                  {isColVisible("status") && <TableCell>
                    <Badge variant={l.status === "sucesso" ? "default" : l.status === "erro" ? "destructive" : "secondary"}>
                      {l.status}
                    </Badge>
                  </TableCell>}
                  {isColVisible("iniciado") && <TableCell className="text-xs">{format(new Date(l.iniciado_em), "dd/MM HH:mm:ss", { locale: ptBR })}</TableCell>}
                  {isColVisible("finalizado") && <TableCell className="text-xs">{l.finalizado_em ? format(new Date(l.finalizado_em), "dd/MM HH:mm:ss", { locale: ptBR }) : "-"}</TableCell>}
                  {isColVisible("registros") && <TableCell>{l.total_registros ?? "-"}</TableCell>}
                  {isColVisible("tamanho") && <TableCell>{l.tamanho_bytes ? `${Math.round(l.tamanho_bytes / 1024)} KB` : "-"}</TableCell>}
                  {isColVisible("usuario") && <TableCell className="text-xs">{l.usuario_email || "-"}</TableCell>}
                  {isColVisible("erro") && <TableCell className="text-xs text-destructive max-w-[240px] truncate">{l.erro || ""}</TableCell>}
                </TableRow>
              ))}
              {sortedLogs.length === 0 && (
                <TableRow><TableCell colSpan={logColumns.filter(c => isColVisible(c.key)).length} className="text-center py-6 text-muted-foreground">Sem registros ainda.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}