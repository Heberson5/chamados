   import { useEffect, useState, useMemo } from "react";
 import { useNavigate } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
  import { FileSpreadsheet, FileText, ArrowRightLeft, Clock, Users as UsersIcon, Ticket as TicketIcon, AlertOctagon, Loader2 } from "lucide-react";
 import jsPDF from 'jspdf';
 import autoTable from 'jspdf-autotable';
  import { exportStyledExcel } from "@/lib/excelReport";
   import { useToast } from "@/hooks/use-toast";
 import { usePermissions } from "@/hooks/usePermissions";
 import { useBranding } from "@/hooks/useBranding";
  import { getPriorityLabel } from "@/lib/utils/priority";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { useSortableTable, useColumnVisibility } from "@/hooks/useSortableTable";
 import { SortableTableHead } from "@/components/SortableTableHead";
 import { ColumnVisibilityMenu, type ColumnDef } from "@/components/ColumnVisibilityMenu";
 import FlexibleChart from "@/components/FlexibleChart";
 import ChartSettingsButton from "@/components/ChartSettingsButton";
 import { useChartSettings } from "@/hooks/useChartSettings";
 import type { ChartType } from "@/lib/chartSettings";
 import PdfExportDialog, { type PdfExportMode } from "@/components/PdfExportDialog";

 export default function Reports() {
   const { branding } = useBranding();
     const navigate = useNavigate();
     const { toast } = useToast();
     const [tickets, setTickets] = useState<any[]>([]);
     const [loading, setLoading] = useState(true);
      const [transfers, setTransfers] = useState<any[]>([]);
      const [statuses, setStatuses] = useState<any[]>([]);

     const fetchData = async () => {
      const [{ data, error }, { data: statusesData }] = await Promise.all([
        supabase
          .from("chamados")
          .select(`
            *,
            tecnico:profiles!chamados_tecnico_id_fkey(nome, sobrenome),
            usuario:profiles!chamados_usuario_id_fkey(nome, sobrenome),
            prioridade_obj:prioridade_id(id, nome, cor, ordem)
          `),
        supabase.from("chamado_statuses").select("*").eq("ativo", true).order("ordem", { ascending: true }),
      ]);

       if (data) setTickets(data);
       if (statusesData) setStatuses(statusesData);
        const { data: trData } = await supabase
          .from("transferencias_chamado")
          .select("id, chamado_id, motivo, transferido_em, tecnico_anterior_id, tecnico_novo_id")
          .order("transferido_em", { ascending: false });

        if (trData && trData.length > 0) {
          const userIds = Array.from(new Set(trData.flatMap((t: any) => [t.tecnico_anterior_id, t.tecnico_novo_id].filter(Boolean))));
          const chamadoIds = Array.from(new Set(trData.map((t: any) => t.chamado_id).filter(Boolean)));

          const [{ data: profs }, { data: chams }, { data: depts }] = await Promise.all([
            supabase.from("profiles").select("id, nome, sobrenome, department_id").in("id", userIds),
            supabase.from("chamados").select("id, os, titulo, gerado_em, atendido_em, department_id").in("id", chamadoIds),
            supabase.from("departamentos").select("id, nome"),
          ]);
          const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
          const chamMap = new Map((chams || []).map((c: any) => [c.id, c]));
          const deptMap = new Map((depts || []).map((d: any) => [d.id, d]));

          const enriched = trData.map((t: any) => {
            const cham = chamMap.get(t.chamado_id);
            return {
              ...t,
              tecnico_anterior: profMap.get(t.tecnico_anterior_id) || null,
              tecnico_novo: profMap.get(t.tecnico_novo_id) || null,
              chamado: cham ? { ...cham, departamento: deptMap.get(cham.department_id) || null } : null,
            };
          });
          setTransfers(enriched);
        } else {
          setTransfers([]);
        }
       setLoading(false);
     };
 
     useEffect(() => {
       fetchData();
       
       const channel = supabase
         .channel('reports-realtime')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () => fetchData())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'transferencias_chamado' }, () => fetchData())
         .subscribe();
 
       return () => { supabase.removeChannel(channel); };
     }, []);
 
     const stats = useMemo(() => {
       const statusCounts = tickets.reduce((acc: any, t) => {
         const statusDef = statuses.find((s: any) => s.legacy_enum === t.status || s.key === t.status);
         const label = statusDef ? statusDef.label : t.status;
         acc[label] = (acc[label] || 0) + 1;
         return acc;
       }, {});
       const byStatus = Object.keys(statusCounts).map(s => ({ name: s, value: statusCounts[s] }));
 
       const technicianCounts = tickets.reduce((acc: any, t) => {
         if (t.tecnico) {
           const name = `${t.tecnico.nome} ${t.tecnico.sobrenome}`;
           acc[name] = (acc[name] || 0) + 1;
         }
         return acc;
       }, {});
       const byTechnician = Object.keys(technicianCounts).map(name => ({ name, resolvidos: technicianCounts[name] }));
 
        const priorityCounts = tickets.reduce((acc: any, t) => {
          const label = t.prioridade_obj?.nome || getPriorityLabel(t.prioridade);
          acc[label] = (acc[label] || 0) + 1;
          return acc;
        }, {});
        const byPriority = Object.keys(priorityCounts).map(name => ({ name, value: priorityCounts[name] }));
 
       return { byStatus, byTechnician, byPriority };
     }, [tickets, statuses]);

    // Transfer stats
    const transferStats = useMemo(() => {
      const total = transfers.length;
      const byTec: Record<string, { nome: string; saidas: number; entradas: number }> = {};
      const byDept: Record<string, { dept: string; total: number }> = {};
      let totalHoldMinutes = 0;
      let countHold = 0;

      // Group transfers per chamado to compute "hold time" between transfers
      const byChamado: Record<string, any[]> = {};
      transfers.forEach(t => {
        (byChamado[t.chamado_id] ||= []).push(t);
      });
      Object.values(byChamado).forEach(list => {
        const sorted = [...list].sort((a, b) => new Date(a.transferido_em).getTime() - new Date(b.transferido_em).getTime());
        sorted.forEach((tr, idx) => {
          const prevTime = idx === 0
            ? (tr.chamado?.atendido_em || tr.chamado?.gerado_em)
            : sorted[idx - 1].transferido_em;
          if (prevTime) {
            const diff = (new Date(tr.transferido_em).getTime() - new Date(prevTime).getTime()) / 60000;
            if (diff > 0) {
              totalHoldMinutes += diff;
              countHold += 1;
            }
          }
        });
      });

      transfers.forEach(t => {
        if (t.tecnico_anterior) {
          const key = t.tecnico_anterior.id;
          const nome = `${t.tecnico_anterior.nome ?? ""} ${t.tecnico_anterior.sobrenome ?? ""}`.trim();
          byTec[key] = byTec[key] || { nome, saidas: 0, entradas: 0 };
          byTec[key].saidas += 1;
        }
        if (t.tecnico_novo) {
          const key = t.tecnico_novo.id;
          const nome = `${t.tecnico_novo.nome ?? ""} ${t.tecnico_novo.sobrenome ?? ""}`.trim();
          byTec[key] = byTec[key] || { nome, saidas: 0, entradas: 0 };
          byTec[key].entradas += 1;
        }
        const deptName = t.chamado?.departamento?.nome || "Sem departamento";
        byDept[deptName] = byDept[deptName] || { dept: deptName, total: 0 };
        byDept[deptName].total += 1;
      });

      const avgHold = countHold > 0 ? Math.round(totalHoldMinutes / countHold) : 0;
      const formatMinutes = (m: number) => {
        if (m < 60) return `${m} min`;
        const h = Math.floor(m / 60);
        const r = m % 60;
        if (h < 24) return `${h}h ${r}m`;
        const d = Math.floor(h / 24);
        return `${d}d ${h % 24}h`;
      };

      return {
        total,
        avgHoldMinutes: avgHold,
        avgHoldLabel: formatMinutes(avgHold),
        byTec: Object.values(byTec).sort((a, b) => (b.saidas + b.entradas) - (a.saidas + a.entradas)),
        byDept: Object.values(byDept).sort((a, b) => b.total - a.total),
      };
    }, [transfers]);

    const kpis = useMemo(() => {
      const total = tickets.length;
      const abertos = tickets.filter(t => ["ABERTO", "EM_ATENDIMENTO", "PAUSADO", "AGUARDANDO_USUARIO", "REABERTO"].includes(t.status)).length;
      const encerrados = tickets.filter(t => t.status === "ENCERRADO").length;
      const slaViolados = tickets.filter(t => t.sla_violado).length;
      const reabertos = tickets.filter(t => t.reaberto).length;
      return { total, abertos, encerrados, slaViolados, reabertos };
    }, [tickets]);
 
    const getReportSettings = async () => {
      const { data: settings } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "report_layout")
        .single();
      
      const val = settings?.value as any || {};
      if (!val.columns) {
        val.columns = [
          { id: 'os', label: 'OS', visible: true, field: 'os' },
          { id: 'titulo', label: 'Título', visible: true, field: 'titulo' },
          { id: 'status', label: 'Status', visible: true, field: 'status' },
          { id: 'prioridade', label: 'Prioridade', visible: true, field: 'prioridade' },
          { id: 'gerado_em', label: 'Data de Abertura', visible: true, field: 'gerado_em' },
          { id: 'tecnico', label: 'Técnico', visible: true, field: 'tecnico' },
        ];
      }
      return val;
    };

    const formatCellValue = (ticket: any, field: string) => {
      const f = field || '';
      switch (f) {
        case 'os': return ticket.os;
        case 'titulo': return ticket.titulo;
        case 'descricao': return ticket.descricao;
        case 'status': return ticket.status;
        case 'prioridade': return ticket.prioridade_obj?.nome || getPriorityLabel(ticket.prioridade);
        case 'gerado_em': return new Date(ticket.gerado_em).toLocaleDateString('pt-BR');
        case 'encerrado_em': return ticket.encerrado_em ? new Date(ticket.encerrado_em).toLocaleDateString('pt-BR') : '-';
        case 'atendido_em': return ticket.atendido_em ? new Date(ticket.atendido_em).toLocaleDateString('pt-BR') : '-';
        case 'sla_deadline': return ticket.sla_deadline ? new Date(ticket.sla_deadline).toLocaleDateString('pt-BR') : '-';
        case 'tecnico': return ticket.tecnico ? `${ticket.tecnico.nome} ${ticket.tecnico.sobrenome}` : '-';
        case 'usuario': return ticket.usuario ? `${ticket.usuario.nome} ${ticket.usuario.sobrenome}` : '-';
        case 'descricao_encerramento': return ticket.descricao_encerramento || '-';
        default: return '';
      }
    };

    const exportToExcel = async () => {
      try {
        const layout = await getReportSettings();
        const visibleColumns = layout.columns.filter((c: any) => c.visible);

        await exportStyledExcel({
          filename: "Relatorio_Chamados.xlsx",
          sheetName: "Chamados",
          headerText: layout.headerText || branding.companyName || "Relatório de Chamados",
          footerText: layout.footerText || "Relatório gerado pelo sistema",
          headerColor: layout.headerColor || "#000000",
          headerTextColor: layout.headerTextColor || "#ffffff",
          logoDataUrl: layout.showLogo ? (branding.companyLogo || null) : null,
          columns: visibleColumns.map((c: any) => ({ label: c.label })),
          rows: tickets.map(t => visibleColumns.map((col: any) => formatCellValue(t, col.field))),
        });
         toast({ title: "Sucesso", description: "Excel exportado com sucesso!" });
       } catch (error: any) {
         toast({ variant: "destructive", title: "Erro ao exportar Excel", description: error.message });
       }
     };
 
   const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

   const exportToPDF = async (mode: PdfExportMode) => {
     try {
       const layout = await getReportSettings();
       const visibleColumns = layout.columns.filter((c: any) => c.visible);
       const includeList = mode !== "charts";
       const includeCharts = mode !== "list";
       const orientation = includeList && visibleColumns.length > 5 ? 'landscape' : 'portrait';
       const doc = new jsPDF({ orientation });

       const pageWidth = doc.internal.pageSize.getWidth();
       const pageHeight = doc.internal.pageSize.getHeight();

       // Header background
       doc.setFillColor(layout.headerColor || "#000000");
       doc.rect(0, 0, pageWidth, 25, 'F');

       // Add Logo if available and showLogo is true
       let headerTextX = 15;
       const alignment = layout.logoAlignment || 'left';

        if (layout.showLogo && branding.companyLogo) {
          try {
            const logoW = layout.logoWidth || 18;
            const logoH = layout.logoHeight || 18;
            const logoY = (25 - logoH) / 2;
            let logoX = 10;

            if (alignment === 'center') {
              logoX = (pageWidth / 2) - (logoW / 2);
              headerTextX = (pageWidth / 2);
            } else {
              headerTextX = 15 + logoW + 2;
            }

            doc.addImage(branding.companyLogo, 'PNG', logoX, logoY, logoW, logoH, undefined, 'FAST');
          } catch (e) {
            console.error("Error adding logo to PDF:", e);
          }
        } else if (alignment === 'center') {
         headerTextX = (pageWidth / 2);
       }

        if (layout.headerTextColor) {
          const hex = layout.headerTextColor.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          doc.setTextColor(r, g, b);
        } else {
          doc.setTextColor(255, 255, 255);
        }
       doc.setFontSize(18);

        const headerText = layout.headerText || branding.companyName || "Relatório de Chamados";

        if (alignment === 'center') {
          doc.text(headerText, headerTextX, 18, { align: 'center' });
        } else {
          doc.text(headerText, headerTextX, 16);
        }

       let cursorY = 35;

       if (includeCharts) {
         const chartsEl = document.getElementById("pdf-charts-section");
         if (chartsEl) {
           const html2canvas = (await import("html2canvas")).default;
           const canvas = await html2canvas(chartsEl, { scale: 2, backgroundColor: "#ffffff" });
           const imgData = canvas.toDataURL("image/png");
           const imgWidth = pageWidth - 20;
           const imgHeight = (canvas.height * imgWidth) / canvas.width;
           let heightLeft = imgHeight;
           let position = cursorY;
           doc.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
           heightLeft -= pageHeight - position;
           while (heightLeft > 0) {
             doc.addPage();
             position = heightLeft - imgHeight;
             doc.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
             heightLeft -= pageHeight;
           }
           cursorY = pageHeight - heightLeft + 10;
           if (includeList) doc.addPage();
         }
       }

       if (includeList) {
         autoTable(doc, {
           startY: includeCharts ? 15 : cursorY,
           head: [visibleColumns.map((c: any) => c.label)],
           body: tickets.map(t => visibleColumns.map((col: any) => formatCellValue(t, col.field))),
           theme: 'striped',
            headStyles: {
              fillColor: layout.headerColor || [0, 0, 0],
              textColor: layout.headerTextColor || "#ffffff",
              fontSize: orientation === 'landscape' ? 10 : 9
            },
           styles: {
             fontSize: orientation === 'landscape' ? 9 : 8,
             cellPadding: 2
           }
         });
       }

       const pageCount = (doc as any).internal.getNumberOfPages();
       for (let i = 1; i <= pageCount; i++) {
         doc.setPage(i);
         doc.setFontSize(9);
         doc.setTextColor(100);
         const printDate = new Date().toLocaleString('pt-BR');

         // Footer (Responsive positioning)
         const footerY = pageHeight - 10;
         doc.text(layout.footerText || "Relatório gerado pelo sistema", 15, footerY - 5);
         doc.text(`Impresso em: ${printDate}`, 15, footerY);
         doc.text(`Página ${i} de ${pageCount}`, pageWidth - 40, footerY);
       }

       doc.save("Relatorio_Chamados.pdf");
       toast({ title: "Sucesso", description: "PDF exportado com sucesso!" });
     } catch (error: any) {
       console.error("PDF Export Error:", error);
       toast({ variant: "destructive", title: "Erro ao exportar PDF", description: error.message });
     }
   };
  
      const { hasPermission, loading: permsLoading } = usePermissions();

      useEffect(() => {
        if (!permsLoading && !hasPermission("relatorios")) {
          navigate("/chamados");
        }
      }, [permsLoading, hasPermission, navigate]);
  
     const { getSetting, updateSetting } = useChartSettings();
     const ALL_TYPES: ChartType[] = ["pizza", "rosca", "barras", "linha", "area"];
     const MULTI_SERIES_TYPES: ChartType[] = ["barras", "linha", "area"];

     const transferColumns: ColumnDef[] = [
       { key: "os", label: "OS" },
       { key: "de", label: "De" },
       { key: "para", label: "Para" },
       { key: "departamento", label: "Departamento" },
       { key: "motivo", label: "Motivo" },
       { key: "data", label: "Data" },
     ];
     const { isVisible: isTransferColVisible, toggle: toggleTransferColumn } = useColumnVisibility(transferColumns.map(c => c.key));
     const getTransferSortValue = (t: any, key: string) => {
       switch (key) {
         case "os": return t.chamado?.os || "";
         case "de": return t.tecnico_anterior ? `${t.tecnico_anterior.nome} ${t.tecnico_anterior.sobrenome ?? ""}` : "";
         case "para": return t.tecnico_novo ? `${t.tecnico_novo.nome} ${t.tecnico_novo.sobrenome ?? ""}` : "";
         case "departamento": return t.chamado?.departamento?.nome || "";
         case "motivo": return t.motivo || "";
         case "data": return t.transferido_em ? new Date(t.transferido_em).getTime() : null;
         default: return "";
       }
     };
     const { sortedData: sortedTransfers, sortKey: transferSortKey, sortDirection: transferSortDirection, requestSort: requestTransferSort } = useSortableTable(transfers.slice(0, 20), getTransferSortValue);

   return (
     <div className="p-4 md:p-8 w-full space-y-8 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
           <h1 className="text-3xl font-bold tracking-tight">Relatórios Operacionais</h1>
           <p className="text-muted-foreground">Análise detalhada de atendimentos e desempenho.</p>
         </div>
         <div className="flex gap-2">
           <Button variant="outline" onClick={exportToExcel} className="gap-2">
             <FileSpreadsheet size={18} /> Excel
           </Button>
           <Button variant="outline" onClick={() => setPdfDialogOpen(true)} className="gap-2">
             <FileText size={18} /> PDF
           </Button>
         </div>
       </div>

       {loading ? (
         <div className="flex justify-center py-16">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
       ) : (
       <>
         {/* KPIs */}
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
           <Card><CardContent className="p-4">
             <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Total</span><TicketIcon size={14}/></div>
             <div className="text-2xl font-bold mt-1">{kpis.total}</div>
           </CardContent></Card>
           <Card><CardContent className="p-4">
             <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Em andamento</span><Clock size={14}/></div>
             <div className="text-2xl font-bold mt-1 text-amber-600">{kpis.abertos}</div>
           </CardContent></Card>
           <Card><CardContent className="p-4">
             <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Encerrados</span><TicketIcon size={14}/></div>
             <div className="text-2xl font-bold mt-1 text-emerald-600">{kpis.encerrados}</div>
           </CardContent></Card>
           <Card><CardContent className="p-4">
             <div className="flex items-center justify-between text-xs text-muted-foreground"><span>SLA violado</span><AlertOctagon size={14}/></div>
             <div className="text-2xl font-bold mt-1 text-destructive">{kpis.slaViolados}</div>
           </CardContent></Card>
           <Card><CardContent className="p-4">
             <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Transferências</span><ArrowRightLeft size={14}/></div>
             <div className="text-2xl font-bold mt-1 text-purple-600">{transferStats.total}</div>
             <div className="text-[10px] text-muted-foreground mt-1">Tempo médio antes da transferência: <strong>{transferStats.avgHoldLabel}</strong></div>
           </CardContent></Card>
         </div>
 
         <div id="pdf-charts-section" className="space-y-8">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           <Card className="hover:shadow-lg transition-shadow duration-300">
             <CardHeader className="flex flex-row items-center justify-between space-y-0">
               <CardTitle>Status dos Chamados</CardTitle>
               <ChartSettingsButton
                 value={getSetting("reports_status", { type: "pizza", color: "#1d2025", legend: "automatica" })}
                 allowedTypes={ALL_TYPES}
                 onChange={(patch) => updateSetting("reports_status", patch)}
               />
             </CardHeader>
             <CardContent className="h-[300px]">
               <FlexibleChart
                 {...getSetting("reports_status", { type: "pizza", color: "#1d2025", legend: "automatica" })}
                 data={stats.byStatus}
                 xKey="name"
                 series={[{ dataKey: "value", name: "Total" }]}
               />
             </CardContent>
           </Card>

           <Card className="hover:shadow-lg transition-shadow duration-300">
             <CardHeader className="flex flex-row items-center justify-between space-y-0">
               <CardTitle>Prioridade dos Chamados</CardTitle>
               <ChartSettingsButton
                 value={getSetting("reports_priority", { type: "barras", color: "#4747eb", legend: "automatica" })}
                 allowedTypes={ALL_TYPES}
                 onChange={(patch) => updateSetting("reports_priority", patch)}
               />
             </CardHeader>
             <CardContent className="h-[300px]">
               <FlexibleChart
                 {...getSetting("reports_priority", { type: "barras", color: "#4747eb", legend: "automatica" })}
                 data={stats.byPriority}
                 xKey="name"
                 series={[{ dataKey: "value", name: "Total" }]}
               />
             </CardContent>
           </Card>

           <Card className="hover:shadow-lg transition-shadow duration-300">
             <CardHeader className="flex flex-row items-center justify-between space-y-0">
               <CardTitle>Performance de Técnicos</CardTitle>
               <ChartSettingsButton
                 value={getSetting("reports_technicians", { type: "barras", color: "#1d2025", legend: "automatica" })}
                 allowedTypes={ALL_TYPES}
                 onChange={(patch) => updateSetting("reports_technicians", patch)}
               />
             </CardHeader>
             <CardContent className="h-[300px]">
               <FlexibleChart
                 {...getSetting("reports_technicians", { type: "barras", color: "#1d2025", legend: "automatica" })}
                 data={stats.byTechnician}
                 xKey="name"
                 series={[{ dataKey: "resolvidos", name: "Atendimentos" }]}
               />
             </CardContent>
           </Card>
         </div>

         {/* Transferências */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <Card className="hover:shadow-lg transition-shadow duration-300">
             <CardHeader className="flex flex-row items-center justify-between space-y-0">
               <CardTitle className="flex items-center gap-2"><UsersIcon size={18}/> Transferências por Técnico</CardTitle>
               <ChartSettingsButton
                 value={getSetting("reports_transfers_tec", { type: "barras", color: "#dc2828", legend: "automatica" })}
                 allowedTypes={MULTI_SERIES_TYPES}
                 onChange={(patch) => updateSetting("reports_transfers_tec", patch)}
               />
             </CardHeader>
             <CardContent className="h-[320px]">
               {transferStats.byTec.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Nenhuma transferência registrada.</div>
               ) : (
                 <FlexibleChart
                   {...getSetting("reports_transfers_tec", { type: "barras", color: "#dc2828", legend: "automatica" })}
                   data={transferStats.byTec}
                   xKey="nome"
                   series={[{ dataKey: "saidas", name: "Transferiu" }, { dataKey: "entradas", name: "Recebeu" }]}
                 />
               )}
             </CardContent>
           </Card>

           <Card className="hover:shadow-lg transition-shadow duration-300">
             <CardHeader className="flex flex-row items-center justify-between space-y-0">
               <CardTitle className="flex items-center gap-2"><ArrowRightLeft size={18}/> Transferências por Departamento</CardTitle>
               <ChartSettingsButton
                 value={getSetting("reports_transfers_dept", { type: "barras", color: "#4747eb", legend: "automatica" })}
                 allowedTypes={ALL_TYPES}
                 onChange={(patch) => updateSetting("reports_transfers_dept", patch)}
               />
             </CardHeader>
             <CardContent className="h-[320px]">
               {transferStats.byDept.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Nenhuma transferência registrada.</div>
               ) : (
                 <FlexibleChart
                   {...getSetting("reports_transfers_dept", { type: "barras", color: "#4747eb", legend: "automatica" })}
                   data={transferStats.byDept}
                   xKey="dept"
                   series={[{ dataKey: "total", name: "Transferências" }]}
                 />
               )}
             </CardContent>
           </Card>
         </div>
         </div>

         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2"><ArrowRightLeft size={18}/> Últimas Transferências</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-10 px-2">
                       <ColumnVisibilityMenu columns={transferColumns} isVisible={isTransferColVisible} onToggle={toggleTransferColumn} />
                     </TableHead>
                     {isTransferColVisible("os") && <SortableTableHead label="OS" sortKey="os" currentSortKey={transferSortKey} direction={transferSortDirection} onSort={requestTransferSort} />}
                     {isTransferColVisible("de") && <SortableTableHead label="De" sortKey="de" currentSortKey={transferSortKey} direction={transferSortDirection} onSort={requestTransferSort} />}
                     {isTransferColVisible("para") && <SortableTableHead label="Para" sortKey="para" currentSortKey={transferSortKey} direction={transferSortDirection} onSort={requestTransferSort} />}
                     {isTransferColVisible("departamento") && <SortableTableHead label="Departamento" sortKey="departamento" currentSortKey={transferSortKey} direction={transferSortDirection} onSort={requestTransferSort} />}
                     {isTransferColVisible("motivo") && <SortableTableHead label="Motivo" sortKey="motivo" currentSortKey={transferSortKey} direction={transferSortDirection} onSort={requestTransferSort} />}
                     {isTransferColVisible("data") && <SortableTableHead label="Data" sortKey="data" currentSortKey={transferSortKey} direction={transferSortDirection} onSort={requestTransferSort} />}
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {sortedTransfers.map((t) => (
                     <TableRow key={t.id}>
                       <TableCell className="w-10 px-2" />
                       {isTransferColVisible("os") && <TableCell className="font-mono text-xs">{t.chamado?.os || "-"}</TableCell>}
                       {isTransferColVisible("de") && <TableCell className="text-xs">{t.tecnico_anterior ? `${t.tecnico_anterior.nome} ${t.tecnico_anterior.sobrenome ?? ""}` : "-"}</TableCell>}
                       {isTransferColVisible("para") && <TableCell className="text-xs">{t.tecnico_novo ? `${t.tecnico_novo.nome} ${t.tecnico_novo.sobrenome ?? ""}` : "-"}</TableCell>}
                       {isTransferColVisible("departamento") && <TableCell className="text-xs">{t.chamado?.departamento?.nome || "-"}</TableCell>}
                       {isTransferColVisible("motivo") && <TableCell className="text-xs max-w-[260px] truncate" title={t.motivo}>{t.motivo}</TableCell>}
                       {isTransferColVisible("data") && <TableCell className="text-xs whitespace-nowrap">{new Date(t.transferido_em).toLocaleString('pt-BR')}</TableCell>}
                     </TableRow>
                   ))}
                   {sortedTransfers.length === 0 && (
                     <TableRow><TableCell colSpan={transferColumns.filter(c => isTransferColVisible(c.key)).length + 1} className="text-center py-6 text-muted-foreground text-sm">Nenhuma transferência registrada.</TableCell></TableRow>
                   )}
                 </TableBody>
               </Table>
             </div>
           </CardContent>
         </Card>
       </>
       )}
       <PdfExportDialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen} onConfirm={exportToPDF} />
     </div>
   );
 }