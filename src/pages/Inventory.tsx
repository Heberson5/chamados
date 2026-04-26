 import { useEffect, useState } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { Plus, Search, Package, AlertTriangle, Loader2 } from "lucide-react";
 import { Input } from "@/components/ui/input";
 import { useToast } from "@/hooks/use-toast";
 
 export default function Inventory() {
   const [items, setItems] = useState<any[]>([]);
   const [searchTerm, setSearchTerm] = useState("");
   const [isLoading, setIsLoading] = useState(true);
   const { toast } = useToast();
 
   useEffect(() => {
     const fetchItems = async () => {
       try {
         const { data, error } = await supabase
           .from("itens_inventario")
           .select("*, categorias(nome)");
         
         if (error) throw error;
         setItems(data || []);
       } catch (error: any) {
         toast({ variant: "destructive", title: "Erro ao buscar inventário", description: error.message });
       } finally {
         setIsLoading(false);
       }
     };
 
     fetchItems();
   }, [toast]);
 
   const filteredItems = items.filter(item => 
     item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
     item.numero.toLowerCase().includes(searchTerm.toLowerCase())
   );
 
   return (
     <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
           <h1 className="text-3xl font-bold tracking-tight">Inventário de TI</h1>
           <p className="text-muted-foreground">Controle de hardware, periféricos e suprimentos.</p>
         </div>
         <Button className="flex items-center gap-2">
           <Plus size={18} />
           Novo Item
         </Button>
       </div>
 
       <div className="relative w-full md:max-w-md">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
         <Input 
           placeholder="Buscar por nome, SKU ou número..." 
           className="pl-10"
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
         />
       </div>
 
       <div className="bg-card rounded-md border shadow-sm overflow-x-auto">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Número</TableHead>
               <TableHead>Item</TableHead>
               <TableHead>Categoria</TableHead>
               <TableHead>SKU</TableHead>
               <TableHead>Qtd Atual</TableHead>
               <TableHead>Mínimo</TableHead>
               <TableHead>Status</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {isLoading ? (
               <TableRow>
                 <TableCell colSpan={7} className="text-center py-12">
                   <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                 </TableCell>
               </TableRow>
             ) : filteredItems.map((item) => (
               <TableRow key={item.id}>
                 <TableCell className="font-mono text-xs">{item.numero}</TableCell>
                 <TableCell className="font-medium">{item.nome}</TableCell>
                 <TableCell>{item.categorias?.nome || "-"}</TableCell>
                 <TableCell>{item.sku || "-"}</TableCell>
                 <TableCell>{item.estoque_atual} {item.unidade}</TableCell>
                 <TableCell>{item.estoque_minimo} {item.unidade}</TableCell>
                 <TableCell>
                   {item.estoque_atual <= item.estoque_minimo ? (
                     <Badge variant="destructive" className="flex items-center w-fit gap-1">
                       <AlertTriangle size={12} /> Baixo Estoque
                     </Badge>
                   ) : (
                     <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                       Normal
                     </Badge>
                   )}
                 </TableCell>
               </TableRow>
             ))}
             {!isLoading && filteredItems.length === 0 && (
               <TableRow>
                 <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                   Nenhum item encontrado.
                 </TableCell>
               </TableRow>
             )}
           </TableBody>
         </Table>
       </div>
     </div>
   );
 }