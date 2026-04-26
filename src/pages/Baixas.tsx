 import { useEffect, useState } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { History, AlertCircle, Loader2 } from "lucide-react";
 import { useToast } from "@/hooks/use-toast";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
 export default function Baixas() {
   const [baixas, setBaixas] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const { toast } = useToast();
 
   useEffect(() => {
     const fetchBaixas = async () => {
       try {
         const { data, error } = await supabase
           .from("baixas")
           .select("*, solicitado:profiles!solicitado_por(nome, sobrenome), aprovado:profiles!aprovado_tecnico_por(nome, sobrenome)");
         
         if (error) throw error;
         setBaixas(data || []);
       } catch (error: any) {
         toast({ variant: "destructive", title: "Erro ao buscar baixas", description: error.message });
       } finally {
         setIsLoading(false);
       }
     };
 
     fetchBaixas();
   }, [toast]);
 
   return (
     <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
       <div>
         <h1 className="text-3xl font-bold tracking-tight">Baixas de Inventário</h1>
         <p className="text-muted-foreground">Histórico de solicitações de saída de itens.</p>
       </div>
 
       <div className="bg-card rounded-md border shadow-sm overflow-x-auto">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Número AV</TableHead>
               <TableHead>Solicitante</TableHead>
               <TableHead>Status</TableHead>
               <TableHead>Técnico</TableHead>
               <TableHead>Data</TableHead>
               <TableHead>Justificativa</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {isLoading ? (
               <TableRow>
                 <TableCell colSpan={6} className="text-center py-12">
                   <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                 </TableCell>
               </TableRow>
             ) : baixas.map((baixa) => (
               <TableRow key={baixa.id}>
                 <TableCell className="font-mono text-xs">{baixa.av_numero}</TableCell>
                 <TableCell>{baixa.solicitado?.nome} {baixa.solicitado?.sobrenome}</TableCell>
                 <TableCell>
                   <Badge variant={
                     baixa.status === 'APROVADO' ? 'default' : 
                     baixa.status === 'PENDENTE' ? 'secondary' : 'destructive'
                   }>
                     {baixa.status}
                   </Badge>
                 </TableCell>
                 <TableCell>{baixa.aprovado ? `${baixa.aprovado.nome} ${baixa.aprovado.sobrenome}` : '-'}</TableCell>
                 <TableCell>
                   {baixa.created_at ? format(new Date(baixa.created_at), "dd/MM/yy HH:mm", { locale: ptBR }) : "-"}
                 </TableCell>
                 <TableCell className="max-w-xs truncate">{baixa.justificativa || "-"}</TableCell>
               </TableRow>
             ))}
             {!isLoading && baixas.length === 0 && (
               <TableRow>
                 <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                   <div className="flex flex-col items-center gap-2">
                     <History size={32} className="opacity-20" />
                     <p>Nenhuma baixa encontrada.</p>
                   </div>
                 </TableCell>
               </TableRow>
             )}
           </TableBody>
         </Table>
       </div>
     </div>
   );
 }