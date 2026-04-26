 import { useEffect } from "react";
 import { useNavigate } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { FileSpreadsheet, FileText } from "lucide-react";
 import * as XLSX from 'xlsx';
 import jsPDF from 'jspdf';
 import autoTable from 'jspdf-autotable';
 import { useToast } from "@/hooks/use-toast";
 import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
 
 export default function Reports() {
   const navigate = useNavigate();
   const { toast } = useToast();
 
   const exportToExcel = async () => {
     try {
       const { data: tickets } = await supabase
         .from("chamados")
         .select("os, titulo, descricao, status, prioridade, gerado_em");
       
       if (!tickets) return;
 
       const worksheet = XLSX.utils.json_to_sheet(tickets);
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
       const { data: tickets } = await supabase
         .from("chamados")
         .select("os, titulo, status, prioridade, gerado_em");
       
       if (!tickets) return;
 
       const { data: settings } = await supabase
         .from("system_settings")
         .select("value")
         .eq("key", "report_layout")
         .single();
       
       const layout = settings?.value as any || {};
       const doc = new jsPDF();
 
       // Custom Header
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
 
       // Footer
       const pageCount = (doc as any).internal.getNumberOfPages();
       for (let i = 1; i <= pageCount; i++) {
         doc.setPage(i);
         doc.setFontSize(10);
         doc.setTextColor(150);
         doc.text(layout.footerText || "Help-Me System", 10, 285);
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

   const data = [
     { name: 'Hardware', value: 45 },
     { name: 'Software', value: 25 },
     { name: 'Rede', value: 20 },
     { name: 'Acesso', value: 10 },
   ];
 
   const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
 
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
 
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <Card>
           <CardHeader>
             <CardTitle>Chamados por Categoria</CardTitle>
           </CardHeader>
           <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={data}
                   cx="50%"
                   cy="50%"
                   labelLine={false}
                   label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                   outerRadius={80}
                   fill="#8884d8"
                   dataKey="value"
                 >
                   {data.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader>
             <CardTitle>Performance de Técnicos</CardTitle>
           </CardHeader>
           <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={[
                 { name: 'João', resolvidos: 12 },
                 { name: 'Maria', resolvidos: 19 },
                 { name: 'Carlos', resolvidos: 15 },
                 { name: 'Ana', resolvidos: 22 },
               ]}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="name" />
                 <YAxis />
                 <Tooltip />
                 <Bar dataKey="resolvidos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </CardContent>
         </Card>
       </div>
     </div>
   );
 }