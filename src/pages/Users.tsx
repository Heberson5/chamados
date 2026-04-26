 import { useEffect, useState, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { useToast } from "@/hooks/use-toast";
 import { Loader2, Shield, User as UserIcon, MoreHorizontal } from "lucide-react";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
 import { Database } from "@/integrations/supabase/types";
 
 type Regra = Database["public"]["Enums"]["regra"];
 
 export default function Users() {
 
 export default function Users() {
   const [users, setUsers] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const { toast } = useToast();
   const [selectedUser, setSelectedUser] = useState<any>(null);
 
   const fetchUsers = async () => {
     setLoading(true);
     const { data, error } = await supabase
       .from("profiles")
       .select("*")
       .order("nome");
     
     if (error) {
       toast({ variant: "destructive", title: "Erro ao buscar usuários", description: error.message });
     } else {
       setUsers(data || []);
     }
     setLoading(false);
   };
 
   useEffect(() => {
     fetchUsers();
   }, []);
 
   const updateRole = async (userId: string, newRole: string) => {
     const { error } = await supabase
       .from("profiles")
       .update({ regra: newRole as Regra, is_master: newRole === 'MASTER' })
       .eq("id", userId);
 
     if (error) {
       toast({ variant: "destructive", title: "Erro ao atualizar permissão", description: error.message });
     } else {
       toast({ title: "Sucesso", description: "Permissão atualizada com sucesso!" });
       fetchUsers();
     }
   };
 
   const getRoleLabel = (profile: any) => {
     if (profile.is_master || profile.regra === 'MASTER') return "Master";
     if (profile.regra === 'ADMIN') return "Administrador";
     if (profile.regra === 'TECNICO') return "Técnico";
     return "Usuário";
   };
 
   if (loading && users.length === 0) {
     return (
       <div className="flex h-[50vh] items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
 
   return (
     <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in">
       <div className="flex justify-between items-center">
         <div>
           <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
           <p className="text-muted-foreground">Gerencie as permissões e perfis dos usuários do sistema.</p>
         </div>
       </div>
 
       <div className="bg-card rounded-md border shadow-sm">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Usuário</TableHead>
               <TableHead>E-mail</TableHead>
               <TableHead>Permissão</TableHead>
               <TableHead>Status</TableHead>
               <TableHead className="text-right">Ações</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {users.map((user) => (
               <TableRow key={user.id}>
                 <TableCell className="font-medium">
                   <div className="flex items-center gap-3">
                     <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                       {user.nome?.[0] || <UserIcon size={14} />}
                     </div>
                     <span>{user.nome} {user.sobrenome}</span>
                   </div>
                 </TableCell>
                 <TableCell>{user.email}</TableCell>
                 <TableCell>
                   <Badge variant="outline" className={
                     user.is_master || user.regra === 'MASTER' ? 'border-purple-500 text-purple-500 bg-purple-50' :
                     user.regra === 'ADMIN' ? 'border-blue-500 text-blue-500 bg-blue-50' :
                     user.regra === 'TECNICO' ? 'border-amber-500 text-amber-500 bg-amber-50' :
                     'border-slate-500 text-slate-500 bg-slate-50'
                   }>
                     {getRoleLabel(user)}
                   </Badge>
                 </TableCell>
                 <TableCell>
                   <Badge variant={user.ativo ? "default" : "secondary"}>
                     {user.ativo ? "Ativo" : "Inativo"}
                   </Badge>
                 </TableCell>
                 <TableCell className="text-right">
                   <Select 
                     defaultValue={user.is_master ? 'MASTER' : user.regra} 
                     onValueChange={(value) => updateRole(user.id, value)}
                   >
                     <SelectTrigger className="w-[140px] ml-auto">
                       <SelectValue placeholder="Mudar Permissão" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="MASTER">Master</SelectItem>
                       <SelectItem value="ADMIN">Administrador</SelectItem>
                       <SelectItem value="TECNICO">Técnico</SelectItem>
                       <SelectItem value="USUARIO">Usuário</SelectItem>
                     </SelectContent>
                   </Select>
                 </TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table>
       </div>
     </div>
   );
 }