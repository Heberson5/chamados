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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Iniciado</TableHead>
                <TableHead>Finalizado</TableHead>
                <TableHead>Registros</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell><Badge variant="outline">{l.tipo}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={l.status === "sucesso" ? "default" : l.status === "erro" ? "destructive" : "secondary"}>
                      {l.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{format(new Date(l.iniciado_em), "dd/MM HH:mm:ss", { locale: ptBR })}</TableCell>
                  <TableCell className="text-xs">{l.finalizado_em ? format(new Date(l.finalizado_em), "dd/MM HH:mm:ss", { locale: ptBR }) : "-"}</TableCell>
                  <TableCell>{l.total_registros ?? "-"}</TableCell>
                  <TableCell>{l.tamanho_bytes ? `${Math.round(l.tamanho_bytes / 1024)} KB` : "-"}</TableCell>
                  <TableCell className="text-xs">{l.usuario_email || "-"}</TableCell>
                  <TableCell className="text-xs text-destructive max-w-[240px] truncate">{l.erro || ""}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Sem registros ainda.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}