 import { useEffect, useState } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { Plus, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
 
 export default function Finance() {
   const [requests, setRequests] = useState<any[]>([]);
 
   useEffect(() => {
     const fetchRequests = async () => {
       const { data } = await supabase
         .from("solicitacoes_compra")
         .select("*, profiles!solicitacoes_compra_solicitante_id_fkey(nome)");
       if (data) setRequests(data);
     };
     fetchRequests();
   }, []);
 
   return (
     <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
         <div>
           <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
           <p className="text-muted-foreground">Gestão de compras, reembolsos e fluxos de aprovação.</p>
         </div>
         <Button className="gap-2">
           <Plus size={18} />
           Nova Solicitação
         </Button>
       </div>
 
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="bg-card border rounded-lg p-4 flex items-center justify-between">
           <div>
             <p className="text-sm text-muted-foreground">Total Pendente</p>
             <p className="text-2xl font-bold">R$ 12.450,00</p>
           </div>
           <div className="bg-orange-100 p-2 rounded-full text-orange-600">
             <DollarSign size={20} />
           </div>
         </div>
         <div className="bg-card border rounded-lg p-4 flex items-center justify-between">
           <div>
             <p className="text-sm text-muted-foreground">Aprovado este mês</p>
             <p className="text-2xl font-bold">R$ 45.200,00</p>
           </div>
           <div className="bg-green-100 p-2 rounded-full text-green-600">
             <ArrowUpRight size={20} />
           </div>
         </div>
         <div className="bg-card border rounded-lg p-4 flex items-center justify-between">
           <div>
             <p className="text-sm text-muted-foreground">Reembolsos</p>
             <p className="text-2xl font-bold">R$ 3.120,00</p>
           </div>
           <div className="bg-blue-100 p-2 rounded-full text-blue-600">
             <ArrowDownRight size={20} />
           </div>
         </div>
       </div>
 
       <div className="bg-card rounded-md border shadow-sm">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Número</TableHead>
               <TableHead>Solicitante</TableHead>
               <TableHead>Finalidade</TableHead>
               <TableHead>Valor Total</TableHead>
               <TableHead>Status</TableHead>
               <TableHead>Data</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {requests.map((req) => (
               <TableRow key={req.id}>
                 <TableCell className="font-medium">{req.numero || 'REQ-001'}</TableCell>
                 <TableCell>{req.profiles?.nome}</TableCell>
                 <TableCell className="max-w-xs truncate">{req.finalidade}</TableCell>
                 <TableCell>R$ {req.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                 <TableCell>
                   <Badge variant={
                     req.status === 'APROVADO' ? 'default' : 
                     req.status === 'PENDENTE' ? 'secondary' : 'destructive'
                   }>
                     {req.status}
                   </Badge>
                 </TableCell>
                 <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
               </TableRow>
             ))}
             {requests.length === 0 && (
               <TableRow>
                 <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                   Nenhuma solicitação de compra encontrada.
                 </TableCell>
               </TableRow>
             )}
           </TableBody>
         </Table>
       </div>
     </div>
   );
 }