  import { useEffect, useState, useMemo } from "react";
 import { useNavigate } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { FileSpreadsheet, FileText } from "lucide-react";
 import * as XLSX from 'xlsx';
 import jsPDF from 'jspdf';
 import autoTable from 'jspdf-autotable';
 import { useToast } from "@/hooks/use-toast";
  import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart } from 'recharts';
 
   export default function Reports() {
     const navigate = useNavigate();
     const { toast } = useToast();
     const [tickets, setTickets] = useState<any[]>([]);
     const [loading, setLoading] = useState(true);
 
     const fetchData = async () => {
       const { data, error } = await supabase
         .from("chamados")
         .select(`*, tecnico:profiles!chamados_tecnico_id_fkey(nome, sobrenome)`);
       
       if (data) setTickets(data);
       setLoading(false);
     };
 
     useEffect(() => {
       fetchData();
       
       const channel = supabase
         .channel('reports-realtime')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'chamados' }, () => fetchData())
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
         acc[t.prioridade] = (acc[t.prioridade] || 0) + 1;
         return acc;
       }, {});
       const byPriority = Object.keys(priorityCounts).map(p => ({ name: p, value: priorityCounts[p] }));
 
       return { byStatus, byTechnician, byPriority };
     }, [tickets]);
 
     const exportToExcel = async () => {
       try {
         const worksheet = XLSX.utils.json_to_sheet(tickets.map(t => ({
           OS: t.os,
           Titulo: t.titulo,
           Descricao: t.descricao,
           Status: t.status,
           Prioridade: t.prioridade,
           Data: new Date(t.gerado_em).toLocaleDateString()
         })));
         const workbook = XLSX.utils.book_new();
         XLSX.utils.book_append_sheet(workbook, worksheet, "Chamados");
         XLSX.writeFile(workbook, "Relatorio_Chamados.xlsx");
         toast({ title: "Sucesso", description: "Excel exportado com sucesso!" });
       } catch (error: any) {
         toast({ variant: "destructive", title: "Erro ao exportar Excel", description: error.message });
       }
     };
 
     const exportToPDF = async () => {
       try {
         const { data: settings } = await supabase
           .from("system_settings")
           .select("value")
           .eq("key", "report_layout")
           .single();
         
         const layout = settings?.value as any || {};
         const doc = new jsPDF();
 
         doc.setFillColor(layout.headerColor || "#000000");
         doc.rect(0, 0, 210, 20, 'F');
         doc.setTextColor(255, 255, 255);
         doc.setFontSize(16);
         doc.text("Relatório de Chamados - Help-Me", 10, 13);
 
         autoTable(doc, {
           startY: 30,
           head: [['OS', 'Título', 'Status', 'Prioridade', 'Data']],
           body: tickets.map(t => [t.os, t.titulo, t.status, t.prioridade, new Date(t.gerado_em).toLocaleDateString()]),
           theme: 'striped',
           headStyles: { fillColor: layout.headerColor || [0, 0, 0] }
         });
 
         const pageCount = (doc as any).internal.getNumberOfPages();
         for (let i = 1; i <= pageCount; i++) {
           doc.setPage(i);
           doc.setFontSize(10);
           doc.setTextColor(150);
            const printDate = new Date().toLocaleString('pt-BR');
            doc.text(layout.footerText || "Help-Me System", 10, 280);
            doc.text(`Impresso em: ${printDate}`, 10, 285);
            doc.text(`Página ${i} de ${pageCount}`, 180, 285);
         }
 
         doc.save("Relatorio_Chamados.pdf");
         toast({ title: "Sucesso", description: "PDF exportado com sucesso!" });
       } catch (error: any) {
         toast({ variant: "destructive", title: "Erro ao exportar PDF", description: error.message });
       }
     };
  
     useEffect(() => {
       const checkRole = async () => {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) return;
         const { data } = await supabase.from("profiles").select("regra, is_master").eq("id", user.id).single();
         if (data && data.regra !== 'ADMIN' && data.regra !== 'MASTER' && !data.is_master) {
           navigate("/chamados");
         }
       };
       checkRole();
     }, [navigate]);
  
     const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];
 
   return (
     <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in">
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
 
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           <Card>
             <CardHeader>
               <CardTitle>Status dos Chamados</CardTitle>
             </CardHeader>
             <CardContent className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={stats.byStatus}
                     cx="50%"
                     cy="50%"
                     labelLine={false}
                     label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                     outerRadius={80}
                     dataKey="value"
                   >
                     {stats.byStatus.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
                   <Legend />
                 </PieChart>
               </ResponsiveContainer>
             </CardContent>
           </Card>
 
           <Card>
             <CardHeader>
               <CardTitle>Prioridade dos Chamados</CardTitle>
             </CardHeader>
             <CardContent className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={stats.byPriority}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                   <XAxis dataKey="name" stroke="currentColor" />
                   <YAxis stroke="currentColor" />
                   <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
                   <Bar dataKey="value" name="Total" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             </CardContent>
           </Card>
 
           <Card>
             <CardHeader>
               <CardTitle>Performance de Técnicos</CardTitle>
             </CardHeader>
             <CardContent className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={stats.byTechnician}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                   <XAxis dataKey="name" stroke="currentColor" />
                   <YAxis stroke="currentColor" />
                   <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
                   <Bar dataKey="resolvidos" name="Atendimentos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             </CardContent>
           </Card>
         </div>
     </div>
   );
 }