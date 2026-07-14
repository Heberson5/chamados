import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileText, Search, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useBranding } from "@/hooks/useBranding";
import { getPriorityLabel } from "@/lib/utils/priority";
import { useSortableTable, useColumnVisibility } from "@/hooks/useSortableTable";
import { SortableTableHead } from "@/components/SortableTableHead";
import { ColumnVisibilityMenu, type ColumnDef } from "@/components/ColumnVisibilityMenu";

const STATUS_LABELS: Record<string, string> = {
  ABERTO: "Aberto",
  EM_ATENDIMENTO: "Em Atendimento",
  PAUSADO: "Pausado",
  AGUARDANDO_USUARIO: "Aguardando Usuário",
  REABERTO: "Reaberto",
  ENCERRADO: "Encerrado",
  CANCELADO: "Cancelado",
};

export default function Acompanhamento() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { branding } = useBranding();
  const { hasPermission, loading: permsLoading } = usePermissions();

  useEffect(() => {
    if (!permsLoading && !hasPermission("acompanhamento")) {
      navigate("/dashboard");
    }
  }, [permsLoading, hasPermission, navigate]);

  const [tickets, setTickets] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [usuarioFilter, setUsuarioFilter] = useState("todos");
  const [prioridadeFilter, setPrioridadeFilter] = useState("todas");
  const [departamentoFilter, setDepartamentoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tituloSearch, setTituloSearch] = useState("");
  const [descricaoSearch, setDescricaoSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [{ data: chamados }, { data: depts }, { data: profs }, { data: prios }] = await Promise.all([
      supabase
        .from("chamados")
        .select(`*,
          tecnico:profiles!chamados_tecnico_id_fkey(id, nome, sobrenome),
          usuario:profiles!chamados_usuario_id_fkey(id, nome, sobrenome),
          departamento:departamentos!chamados_department_id_fkey(id, nome),
          prioridade_obj:prioridade_id(id, nome, cor, ordem)
        `)
        .order("gerado_em", { ascending: false }),
      supabase.from("departamentos").select("id, nome").order("nome"),
      supabase.from("profiles").select("id, nome, sobrenome").order("nome"),
      supabase.from("chamados_prioridades").select("id, nome, cor").order("ordem"),
    ]);
    setTickets(chamados || []);
    setDepartments(depts || []);
    setUsers(profs || []);
    setPriorities(prios || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("acompanhamento-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "chamados" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (dateFrom) {
        const start = new Date(`${dateFrom}T00:00:00`).getTime();
        if (new Date(t.gerado_em).getTime() < start) return false;
      }
      if (dateTo) {
        const end = new Date(`${dateTo}T23:59:59.999`).getTime();
        if (new Date(t.gerado_em).getTime() > end) return false;
      }
      if (usuarioFilter !== "todos" && t.usuario_id !== usuarioFilter) return false;
      if (prioridadeFilter !== "todas" && t.prioridade_id !== prioridadeFilter) return false;
      if (departamentoFilter !== "todos" && t.department_id !== departamentoFilter) return false;
      if (statusFilter !== "todos" && t.status !== statusFilter) return false;
      if (tituloSearch && !(t.titulo || "").toLowerCase().includes(tituloSearch.toLowerCase())) return false;
      if (descricaoSearch && !(t.descricao || "").toLowerCase().includes(descricaoSearch.toLowerCase())) return false;
      return true;
    });
  }, [tickets, dateFrom, dateTo, usuarioFilter, prioridadeFilter, departamentoFilter, statusFilter, tituloSearch, descricaoSearch]);

  const listColumns: ColumnDef[] = [
    { key: "os", label: "OS" },
    { key: "titulo", label: "Título" },
    { key: "status", label: "Status" },
    { key: "prioridade", label: "Prioridade" },
    { key: "departamento", label: "Departamento" },
    { key: "solicitante", label: "Solicitante" },
    { key: "tecnico", label: "Técnico" },
    { key: "aberto_em", label: "Aberto em" },
  ];
  const { isVisible: isColVisible, toggle: toggleColumn } = useColumnVisibility(listColumns.map(c => c.key));
  const getSortValue = (t: any, key: string) => {
    switch (key) {
      case "os": return t.os || "";
      case "titulo": return t.titulo || "";
      case "status": return STATUS_LABELS[t.status] || t.status || "";
      case "prioridade": return t.prioridade_obj?.ordem ?? t.prioridade ?? "";
      case "departamento": return t.departamento?.nome || "";
      case "solicitante": return t.usuario ? `${t.usuario.nome} ${t.usuario.sobrenome || ""}` : "";
      case "tecnico": return t.tecnico ? `${t.tecnico.nome} ${t.tecnico.sobrenome || ""}` : "";
      case "aberto_em": return t.gerado_em ? new Date(t.gerado_em).getTime() : null;
      default: return "";
    }
  };
  const { sortedData: sortedFiltered, sortKey, sortDirection, requestSort } = useSortableTable(filtered, getSortValue);

  const clearFilters = () => {
    setDateFrom(""); setDateTo("");
    setUsuarioFilter("todos"); setPrioridadeFilter("todas");
    setDepartamentoFilter("todos"); setStatusFilter("todos");
    setTituloSearch(""); setDescricaoSearch("");
  };

  const buildRows = () =>
    filtered.map(t => ({
      OS: t.os || "",
      Título: t.titulo || "-",
      Descrição: t.descricao || "",
      Status: STATUS_LABELS[t.status] || t.status,
      Prioridade: t.prioridade_obj?.nome || getPriorityLabel(t.prioridade),
      Departamento: t.departamento?.nome || "-",
      Solicitante: t.usuario ? `${t.usuario.nome} ${t.usuario.sobrenome || ""}`.trim() : "-",
      Técnico: t.tecnico ? `${t.tecnico.nome} ${t.tecnico.sobrenome || ""}`.trim() : "-",
      "Aberto em": t.gerado_em ? format(new Date(t.gerado_em), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
      "Encerrado em": t.encerrado_em ? format(new Date(t.encerrado_em), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
    }));

  const exportExcel = () => {
    try {
      const rows = buildRows();
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Acompanhamento");
      XLSX.writeFile(wb, `Acompanhamento_${todayStr}.xlsx`);
      toast({ title: "Sucesso", description: "Excel exportado com sucesso!" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao exportar", description: e.message });
    }
  };

  const exportPDF = async () => {
    try {
      const { data: settings } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "report_layout")
        .maybeSingle();
      const layout: any = (settings?.value as any) || {};

      const rows = buildRows();
      const headers = Object.keys(rows[0] || { OS: "", Título: "", Status: "", Prioridade: "", Departamento: "", Solicitante: "", Técnico: "", "Aberto em": "" });
      const doc = new jsPDF({ orientation: "landscape" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFillColor(layout.headerColor || "#000000");
      doc.rect(0, 0, pageWidth, 25, "F");

      let headerTextX = 15;
      const alignment = layout.logoAlignment || "left";
      if (layout.showLogo && branding.companyLogo) {
        try {
          const logoW = layout.logoWidth || 18;
          const logoH = layout.logoHeight || 18;
          const logoY = (25 - logoH) / 2;
          let logoX = 10;
          if (alignment === "center") {
            logoX = pageWidth / 2 - logoW / 2;
            headerTextX = pageWidth / 2;
          } else {
            headerTextX = 15 + logoW + 2;
          }
          doc.addImage(branding.companyLogo, "PNG", logoX, logoY, logoW, logoH, undefined, "FAST");
        } catch {}
      } else if (alignment === "center") {
        headerTextX = pageWidth / 2;
      }

      if (layout.headerTextColor) {
        const hex = String(layout.headerTextColor).replace("#", "");
        doc.setTextColor(parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16));
      } else {
        doc.setTextColor(255, 255, 255);
      }
      doc.setFontSize(18);
      const headerText = layout.headerText || branding.companyName || "Acompanhamento de Chamados";
      if (alignment === "center") doc.text(headerText, headerTextX, 18, { align: "center" });
      else doc.text(headerText, headerTextX, 16);

      autoTable(doc, {
        startY: 35,
        head: [headers],
        body: rows.map(r => headers.map(h => (r as any)[h] ?? "")),
        theme: "striped",
        headStyles: {
          fillColor: layout.headerColor || [0, 0, 0],
          textColor: layout.headerTextColor || "#ffffff",
          fontSize: 9,
        },
        styles: { fontSize: 8, cellPadding: 2 },
      });

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(100);
        const printDate = new Date().toLocaleString("pt-BR");
        const footerY = pageHeight - 10;
        doc.text(layout.footerText || "Relatório gerado pelo sistema", 15, footerY - 5);
        doc.text(`Impresso em: ${printDate}`, 15, footerY);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 40, footerY);
      }

      doc.save(`Acompanhamento_${todayStr}.pdf`);
      toast({ title: "Sucesso", description: "PDF exportado com sucesso!" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao exportar PDF", description: e.message });
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "ABERTO": return "bg-blue-100 text-blue-700";
      case "EM_ATENDIMENTO": return "bg-amber-100 text-amber-700";
      case "ENCERRADO": return "bg-green-100 text-green-700";
      case "CANCELADO": return "bg-slate-100 text-slate-700";
      case "PAUSADO": return "bg-purple-100 text-purple-700";
      case "AGUARDANDO_USUARIO": return "bg-yellow-100 text-yellow-700";
      case "REABERTO": return "bg-orange-100 text-orange-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="p-4 md:p-8 w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Acompanhamento de Chamados</h1>
          <p className="text-muted-foreground">Visualize todos os chamados (somente leitura) e exporte para Excel ou PDF.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel} className="gap-2">
            <FileSpreadsheet size={18} /> Excel
          </Button>
          <Button variant="outline" onClick={exportPDF} className="gap-2">
            <FileText size={18} /> PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Usuário (Solicitante)</Label>
            <Select value={usuarioFilter} onValueChange={setUsuarioFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nome} {u.sobrenome || ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prioridade</Label>
            <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {priorities.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Departamento</Label>
            <Select value={departamentoFilter} onValueChange={setDepartamentoFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Título</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input className="pl-7" placeholder="Buscar título" value={tituloSearch} onChange={e => setTituloSearch(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Descrição</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input className="pl-7" placeholder="Buscar descrição" value={descricaoSearch} onChange={e => setDescricaoSearch(e.target.value)} />
            </div>
          </div>
          <div className="md:col-span-3 lg:col-span-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">
            Chamados <span className="text-muted-foreground font-normal">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 px-2">
                      <ColumnVisibilityMenu columns={listColumns} isVisible={isColVisible} onToggle={toggleColumn} />
                    </TableHead>
                    {isColVisible("os") && <SortableTableHead label="OS" sortKey="os" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                    {isColVisible("titulo") && <SortableTableHead label="Título" sortKey="titulo" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                    {isColVisible("status") && <SortableTableHead label="Status" sortKey="status" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                    {isColVisible("prioridade") && <SortableTableHead label="Prioridade" sortKey="prioridade" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                    {isColVisible("departamento") && <SortableTableHead label="Departamento" sortKey="departamento" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                    {isColVisible("solicitante") && <SortableTableHead label="Solicitante" sortKey="solicitante" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                    {isColVisible("tecnico") && <SortableTableHead label="Técnico" sortKey="tecnico" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                    {isColVisible("aberto_em") && <SortableTableHead label="Aberto em" sortKey="aberto_em" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFiltered.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="w-10 px-2" />
                      {isColVisible("os") && <TableCell className="font-mono text-xs">{t.os}</TableCell>}
                      {isColVisible("titulo") && <TableCell className="max-w-[220px] truncate">{t.titulo || "-"}</TableCell>}
                      {isColVisible("status") && (
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${statusColor(t.status)}`}>
                          {STATUS_LABELS[t.status] || t.status}
                        </Badge>
                      </TableCell>
                      )}
                      {isColVisible("prioridade") && (
                      <TableCell className="text-xs">
                        {t.prioridade_obj ? (
                          <Badge variant="outline" className="border-none text-[10px]" style={{ backgroundColor: `${t.prioridade_obj.cor}20`, color: t.prioridade_obj.cor }}>
                            {t.prioridade_obj.nome}
                          </Badge>
                        ) : (
                          getPriorityLabel(t.prioridade)
                        )}
                      </TableCell>
                      )}
                      {isColVisible("departamento") && <TableCell className="text-xs">{t.departamento?.nome || "-"}</TableCell>}
                      {isColVisible("solicitante") && <TableCell className="text-xs">{t.usuario ? `${t.usuario.nome} ${t.usuario.sobrenome || ""}` : "-"}</TableCell>}
                      {isColVisible("tecnico") && <TableCell className="text-xs">{t.tecnico ? `${t.tecnico.nome} ${t.tecnico.sobrenome || ""}` : "-"}</TableCell>}
                      {isColVisible("aberto_em") && (
                      <TableCell className="text-xs whitespace-nowrap">
                        {t.gerado_em ? format(new Date(t.gerado_em), "dd/MM/yy HH:mm", { locale: ptBR }) : "-"}
                      </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/chamados?os=${t.os}`)}>
                          <Eye size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedFiltered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={listColumns.filter(c => isColVisible(c.key)).length + 2} className="text-center py-8 text-muted-foreground">
                        Nenhum chamado encontrado com os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}