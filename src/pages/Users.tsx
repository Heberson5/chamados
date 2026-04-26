 import { useEffect, useState } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { Plus, Search, Mail, Phone, MoreVertical } from "lucide-react";
 import { Input } from "@/components/ui/input";
 
 export default function Users() {
   const [users, setUsers] = useState<any[]>([]);
   const [searchTerm, setSearchTerm] = useState("");
 
   useEffect(() => {
     const fetchUsers = async () => {
       const { data } = await supabase
         .from("profiles")
         .select("*")
         .order("nome", { ascending: true });
       if (data) setUsers(data);
     };
     fetchUsers();
   }, []);
 
   const filteredUsers = users.filter(u => 
     u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.email?.toLowerCase().includes(searchTerm.toLowerCase())
   );
 
   const getRoleBadge = (regra: string) => {
     switch (regra) {
       case 'ADMIN': return <Badge className="bg-purple-500">ADMIN</Badge>;
       case 'TECNICO': return <Badge className="bg-blue-500">TÉCNICO</Badge>;
       default: return <Badge variant="secondary">USUÁRIO</Badge>;
     }
   };
 
   return (
     <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
         <div>
           <h1 className="text-3xl font-bold tracking-tight">Gestão de Pessoas</h1>
           <p className="text-muted-foreground">Gerencie perfis, permissões e níveis de acesso.</p>
         </div>
         <Button className="flex items-center gap-2">
           <Plus size={18} />
           Adicionar Usuário
         </Button>
       </div>
 
       <div className="mb-6 relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
         <Input 
           placeholder="Buscar por nome, email ou setor..." 
           className="pl-10"
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
         />
       </div>
 
       <div className="bg-card rounded-md border shadow-sm overflow-x-auto">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Colaborador</TableHead>
               <TableHead>Cargo / Setor</TableHead>
               <TableHead>Regra</TableHead>
               <TableHead>Status</TableHead>
               <TableHead>Contato</TableHead>
               <TableHead className="w-[50px]"></TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {filteredUsers.map((user) => (
               <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                 <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {user.nome?.charAt(0)}{user.sobrenome?.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.nome} {user.sobrenome}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                 </TableCell>
                 <TableCell>
                   <div className="flex flex-col">
                     <span className="text-sm">{user.position_id || 'Colaborador'}</span>
                     <span className="text-xs text-muted-foreground">{user.setor || 'Geral'}</span>
                   </div>
                 </TableCell>
                 <TableCell>
                   {getRoleBadge(user.regra)}
                 </TableCell>
                 <TableCell>
                   <Badge variant={user.ativo ? "outline" : "destructive"} className={user.ativo ? "border-green-500 text-green-500 bg-green-50" : ""}>
                     {user.ativo ? 'Ativo' : 'Inativo'}
                   </Badge>
                 </TableCell>
                 <TableCell>
                   <div className="flex gap-2 text-muted-foreground">
                     <Mail size={16} className="cursor-pointer hover:text-primary transition-colors" />
                     <Phone size={16} className="cursor-pointer hover:text-primary transition-colors" />
                   </div>
                 </TableCell>
                 <TableCell>
                   <Button variant="ghost" size="icon">
                     <MoreVertical size={16} />
                   </Button>
                 </TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table>
       </div>
     </div>
   );
 }