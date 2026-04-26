 import { useEffect, useState, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { Plus, Search, ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
 import { Input } from "@/components/ui/input";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
 import { Label } from "@/components/ui/label";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { useToast } from "@/components/ui/use-toast";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
 export default function Chamados() {
   const [tickets, setTickets] = useState<any[]>([]);
   const [searchTerm, setSearchTerm] = useState("");
   const [statusFilter, setStatusFilter] = useState<string>("todos");
   const [isDialogOpen, setIsDialogOpen] = useState(false);
   const [isLoading, setIsLoading] = useState(false);
   const [newTicket, setNewTicket] = useState({ os: "", descricao: "", prioridade: "P3" });
   const { toast } = useToast();
 
   const fetchTickets = useCallback(async () => {
     const { data, error } = await supabase
       .from("chamados")
       .select(`
         *,
         tecnico:profiles!chamados_tecnico_id_fkey(nome, sobrenome),
         usuario:profiles!chamados_usuario_id_fkey(nome, sobrenome),
         chamado_pai:chamados!chamados_chamado_pai_id_fkey(os)
       `)
       .order("gerado_em", { ascending: false });
     
     if (error) {
       toast({ variant: "destructive", title: "Erro ao buscar chamados", description: error.message });
       return;
     }
     if (data) setTickets(data);
   }, [toast]);
 
   useEffect(() => {
     fetchTickets();
   }, [fetchTickets]);
 
   const handleCreateTicket = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsLoading(true);
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error("Usuário não autenticado");
 
       const { error } = await supabase.from("chamados").insert([
         { 
           ...newTicket, 
           usuario_id: user.id,
           status: "ABERTO"
         }
       ]);
 
       if (error) throw error;
 
       toast({ title: "Sucesso", description: "Chamado criado com sucesso!" });
       setIsDialogOpen(false);
       setNewTicket({ os: "", descricao: "", prioridade: "P3" });
       fetchTickets();
     } catch (error: any) {
       toast({ variant: "destructive", title: "Erro ao criar chamado", description: error.message });
     } finally {
       setIsLoading(false);
     }
   };
 
   const getSLAStatus = (ticket: any) => {
     if (ticket.sla_violado) return { label: "VENCIDO", color: "bg-red-500" };
     if (!ticket.sla_deadline) return { label: "N/A", color: "bg-gray-400" };
     
     const deadline = new Date(ticket.sla_deadline);
     const now = new Date();
     const diffMinutes = (deadline.getTime() - now.getTime()) / (1000 * 60);
     
     if (diffMinutes < 0) return { label: "VENCIDO", color: "bg-red-500" };
     if (diffMinutes < 30) return { label: "VENCENDO", color: "bg-yellow-500 animate-pulse" };
     return { label: "NO PRAZO", color: "bg-green-500" };
   };
 
   const filteredTickets = tickets.filter(t => {
     const matchesSearch = t.os.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.descricao.toLowerCase().includes(searchTerm.toLowerCase());
     const matchesStatus = statusFilter === "todos" || t.status === statusFilter;
     return matchesSearch && matchesStatus;
   });
 
   return (
     <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
         <div>
           <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Chamados</h1>
           <p className="text-muted-foreground">Visualize, gerencie e vincule atendimentos técnicos.</p>
         </div>
         <div className="flex gap-2">
           <Select value={statusFilter} onValueChange={setStatusFilter}>
             <SelectTrigger className="w-[180px]">
               <SelectValue placeholder="Filtrar por status" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="todos">Todos os status</SelectItem>
               <SelectItem value="ABERTO">Aberto</SelectItem>
               <SelectItem value="EM_ATENDIMENTO">Em Atendimento</SelectItem>
               <SelectItem value="ENCERRADO">Encerrado</SelectItem>
               <SelectItem value="CANCELADO">Cancelado</SelectItem>
             </SelectContent>
           </Select>
 
           <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
             <DialogTrigger asChild>
               <Button className="flex items-center gap-2">
                 <Plus size={18} />
                 Novo Chamado
               </Button>
             </DialogTrigger>
             <DialogContent>
               <DialogHeader>
                 <DialogTitle>Criar Novo Chamado</DialogTitle>
               </DialogHeader>
               <form onSubmit={handleCreateTicket} className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="os">Número da OS</Label>
                   <Input 
                     id="os" 
                     required 
                     value={newTicket.os}
                     onChange={e => setNewTicket({...newTicket, os: e.target.value})}
                     placeholder="Ex: OS-2024-001"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="descricao">Descrição</Label>
                   <Input 
                     id="descricao" 
                     required 
                     value={newTicket.descricao}
                     onChange={e => setNewTicket({...newTicket, descricao: e.target.value})}
                     placeholder="Descreva o problema"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="prioridade">Prioridade</Label>
                   <Select 
                     value={newTicket.prioridade} 
                     onValueChange={v => setNewTicket({...newTicket, prioridade: v})}
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="P1">P1 - Crítica</SelectItem>
                       <SelectItem value="P2">P2 - Alta</SelectItem>
                       <SelectItem value="P3">P3 - Média</SelectItem>
                       <SelectItem value="P4">P4 - Baixa</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <DialogFooter>
                   <Button type="submit" disabled={isLoading}>
                     {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Criar Chamado
                   </Button>
                 </DialogFooter>
               </form>
             </DialogContent>
           </Dialog>
         </div>
       </div>
 
       <div className="mb-6 relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
         <Input 
           placeholder="Buscar por OS ou descrição..." 
           className="pl-10"
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
         />
       </div>
 
       <div className="bg-card rounded-md border shadow-sm overflow-x-auto">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead className="w-[100px]">OS</TableHead>
               <TableHead>Descrição</TableHead>
               <TableHead>SLA Status</TableHead>
               <TableHead>Status</TableHead>
               <TableHead>Prioridade</TableHead>
               <TableHead>Técnico</TableHead>
               <TableHead>Data</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {filteredTickets.map((ticket) => {
               const sla = getSLAStatus(ticket);
               return (
                 <TableRow key={ticket.id} className="hover:bg-muted/50 transition-colors">
                   <TableCell className="font-mono font-medium">
                     <div className="flex flex-col">
                       <span>{ticket.os}</span>
                       {ticket.chamado_pai && (
                         <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                           <ArrowRight size={10} /> {ticket.chamado_pai.os}
                         </span>
                       )}
                     </div>
                   </TableCell>
                   <TableCell className="max-w-xs md:max-w-md truncate">
                     <div className="flex flex-col">
                       <span className="truncate">{ticket.descricao}</span>
                       <span className="text-[11px] text-muted-foreground">Solicitante: {ticket.usuario?.nome}</span>
                     </div>
                   </TableCell>
                   <TableCell>
                     <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${sla.color}`} />
                       <span className="text-xs font-bold tracking-wider">{sla.label}</span>
                     </div>
                   </TableCell>
                   <TableCell>
                     <Badge variant={
                       ticket.status === 'ABERTO' ? 'default' : 
                       ticket.status === 'EM_ATENDIMENTO' ? 'secondary' :
                       ticket.status === 'ENCERRADO' ? 'outline' : 'destructive'
                     }>
                       {ticket.status}
                     </Badge>
                   </TableCell>
                   <TableCell>
                     <Badge variant="outline" className={
                       ticket.prioridade === 'P1' ? 'border-red-500 text-red-500 bg-red-50' :
                       ticket.prioridade === 'P2' ? 'border-orange-500 text-orange-500 bg-orange-50' :
                       'border-gray-500'
                     }>
                       {ticket.prioridade}
                     </Badge>
                   </TableCell>
                   <TableCell className="text-sm">
                     {ticket.tecnico ? `${ticket.tecnico.nome} ${ticket.tecnico.sobrenome ? ticket.tecnico.sobrenome.charAt(0) + '.' : ''}` : 'Não atribuído'}
                   </TableCell>
                   <TableCell className="text-sm whitespace-nowrap">
                     {format(new Date(ticket.gerado_em), "dd/MM/yy HH:mm", { locale: ptBR })}
                   </TableCell>
                 </TableRow>
               );
             })}
             {filteredTickets.length === 0 && (
               <TableRow>
                 <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                   <div className="flex flex-col items-center gap-2">
                     <AlertTriangle size={32} className="text-yellow-500" />
                     <p>Nenhum chamado encontrado para os filtros atuais.</p>
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
