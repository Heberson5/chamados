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
  import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart } from 'recharts';
 
 export default function Reports() {
   const { branding } = useBranding();
     const navigate = useNavigate();
     const { toast } = useToast();
     const [tickets, setTickets] = useState<any[]>([]);
     const [loading, setLoading] = useState(true);
      const [transfers, setTransfers] = useState<any[]>([]);
 
     const fetchData = async () => {
      const { data, error } = await supabase
        .from("chamados")
        .select(`
          *,
          tecnico:profiles!chamados_tecnico_id_fkey(nome, sobrenome),
          usuario:profiles!chamados_usuario_id_fkey(nome, sobrenome),
          prioridade_obj:prioridade_id(id, nome, cor, ordem)
        `);
       
       if (data) setTickets(data);
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
         acc[t.status] = (acc[t.status] || 0) + 1;
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
     }, [tickets]);

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
 
   const exportToPDF = async () => {
     try {
       const layout = await getReportSettings();
       const visibleColumns = layout.columns.filter((c: any) => c.visible);
       const orientation = visibleColumns.length > 5 ? 'landscape' : 'portrait';
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
 
       autoTable(doc, {
         startY: 35,
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
  
     const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];
 
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
           <Button variant="outline" onClick={exportToPDF} className="gap-2">
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
 
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           <Card className="hover:shadow-lg transition-shadow duration-300">
             <CardHeader>
               <CardTitle>Status dos Chamados</CardTitle>
             </CardHeader>
             <CardContent className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <defs>
                     <filter id="reportsPieShadow" x="-20%" y="-20%" width="140%" height="140%">
                       <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity={0.25} />
                     </filter>
                   </defs>
                   <Pie
                     data={stats.byStatus}
                     cx="50%"
                     cy="50%"
                     labelLine={false}
                     label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                     outerRadius={80}
                     cornerRadius={6}
                     paddingAngle={3}
                     dataKey="value"
                     style={{ filter: "url(#reportsPieShadow)" }}
                     animationDuration={600}
                   >
                     {stats.byStatus.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="stroke-background hover:opacity-80 transition-opacity" strokeWidth={2} />
                     ))}
                   </Pie>
                   <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
                   <Legend />
                 </PieChart>
               </ResponsiveContainer>
             </CardContent>
           </Card>

           <Card className="hover:shadow-lg transition-shadow duration-300">
             <CardHeader>
               <CardTitle>Prioridade dos Chamados</CardTitle>
             </CardHeader>
             <CardContent className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={stats.byPriority}>
                   <defs>
                     <linearGradient id="colorReportsPrioridade" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.95} />
                       <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.55} />
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                   <XAxis dataKey="name" stroke="currentColor" />
                   <YAxis stroke="currentColor" />
                   <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
                   <Bar dataKey="value" name="Total" fill="url(#colorReportsPrioridade)" radius={[8, 8, 0, 0]} className="transition-all duration-300 hover:opacity-80" animationDuration={600} />
                 </BarChart>
               </ResponsiveContainer>
             </CardContent>
           </Card>

           <Card className="hover:shadow-lg transition-shadow duration-300">
             <CardHeader>
               <CardTitle>Performance de Técnicos</CardTitle>
             </CardHeader>
             <CardContent className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={stats.byTechnician}>
                   <defs>
                     <linearGradient id="colorReportsTecnicos" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                       <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                   <XAxis dataKey="name" stroke="currentColor" />
                   <YAxis stroke="currentColor" />
                   <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
                   <Bar dataKey="resolvidos" name="Atendimentos" fill="url(#colorReportsTecnicos)" radius={[8, 8, 0, 0]} className="transition-all duration-300 hover:opacity-80" animationDuration={600} />
                 </BarChart>
               </ResponsiveContainer>
             </CardContent>
           </Card>
         </div>

         {/* Transferências */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <Card className="hover:shadow-lg transition-shadow duration-300">
             <CardHeader>
               <CardTitle className="flex items-center gap-2"><UsersIcon size={18}/> Transferências por Técnico</CardTitle>
             </CardHeader>
             <CardContent className="h-[320px]">
               {transferStats.byTec.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Nenhuma transferência registrada.</div>
               ) : (
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={transferStats.byTec}>
                     <defs>
                       <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.95} />
                         <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.55} />
                       </linearGradient>
                       <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                         <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                     <XAxis dataKey="nome" stroke="currentColor" tick={{ fontSize: 11 }} />
                     <YAxis stroke="currentColor" />
                     <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                     <Legend />
                     <Bar dataKey="saidas" name="Transferiu" fill="url(#colorSaidas)" radius={[8,8,0,0]} className="transition-all duration-300 hover:opacity-80" animationDuration={600} />
                     <Bar dataKey="entradas" name="Recebeu" fill="url(#colorEntradas)" radius={[8,8,0,0]} className="transition-all duration-300 hover:opacity-80" animationDuration={600} />
                   </BarChart>
                 </ResponsiveContainer>
               )}
             </CardContent>
           </Card>

           <Card className="hover:shadow-lg transition-shadow duration-300">
             <CardHeader>
               <CardTitle className="flex items-center gap-2"><ArrowRightLeft size={18}/> Transferências por Departamento</CardTitle>
             </CardHeader>
             <CardContent className="h-[320px]">
               {transferStats.byDept.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Nenhuma transferência registrada.</div>
               ) : (
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={transferStats.byDept}>
                     <defs>
                       <linearGradient id="colorDept" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.95} />
                         <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.55} />
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                     <XAxis dataKey="dept" stroke="currentColor" tick={{ fontSize: 11 }} />
                     <YAxis stroke="currentColor" />
                     <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                     <Bar dataKey="total" name="Transferências" fill="url(#colorDept)" radius={[8,8,0,0]} className="transition-all duration-300 hover:opacity-80" animationDuration={600} />
                   </BarChart>
                 </ResponsiveContainer>
               )}
             </CardContent>
           </Card>
         </div>

         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2"><ArrowRightLeft size={18}/> Últimas Transferências</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="overflow-x-auto">
               <table className="w-full text-sm">
                 <thead>
                   <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                     <th className="py-2 pr-2">OS</th>
                     <th className="py-2 pr-2">De</th>
                     <th className="py-2 pr-2">Para</th>
                     <th className="py-2 pr-2">Departamento</th>
                     <th className="py-2 pr-2">Motivo</th>
                     <th className="py-2 pr-2">Data</th>
                   </tr>
                 </thead>
                 <tbody>
                   {transfers.slice(0, 20).map((t) => (
                     <tr key={t.id} className="border-b hover:bg-muted/40">
                       <td className="py-2 pr-2 font-mono text-xs">{t.chamado?.os || "-"}</td>
                       <td className="py-2 pr-2 text-xs">{t.tecnico_anterior ? `${t.tecnico_anterior.nome} ${t.tecnico_anterior.sobrenome ?? ""}` : "-"}</td>
                       <td className="py-2 pr-2 text-xs">{t.tecnico_novo ? `${t.tecnico_novo.nome} ${t.tecnico_novo.sobrenome ?? ""}` : "-"}</td>
                       <td className="py-2 pr-2 text-xs">{t.chamado?.departamento?.nome || "-"}</td>
                       <td className="py-2 pr-2 text-xs max-w-[260px] truncate" title={t.motivo}>{t.motivo}</td>
                       <td className="py-2 pr-2 text-xs whitespace-nowrap">{new Date(t.transferido_em).toLocaleString('pt-BR')}</td>
                     </tr>
                   ))}
                   {transfers.length === 0 && (
                     <tr><td colSpan={6} className="text-center py-6 text-muted-foreground text-sm">Nenhuma transferência registrada.</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
           </CardContent>
         </Card>
       </>
       )}
     </div>
   );
 }