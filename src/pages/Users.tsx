 import { useEffect, useState, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { useToast } from "@/hooks/use-toast";
 import { Loader2, Shield, User as UserIcon, MoreHorizontal, Plus, Trash2, Power, PowerOff } from "lucide-react";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
 import { Database } from "@/integrations/supabase/types";
 
 type Regra = Database["public"]["Enums"]["regra"];
 
 export default function Users() {
   const [users, setUsers] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const { toast } = useToast();
   const [selectedUser, setSelectedUser] = useState<any>(null);
   const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
   const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
   const [reassignToId, setReassignToId] = useState("");
    const [newUser, setNewUser] = useState({ nome: "", sobrenome: "", email: "", regra: "USUARIO" as Regra });
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editUser, setEditUser] = useState<any>(null);

    const handleEditUser = async () => {
      if (!editUser) return;
      setLoading(true);
      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            nome: editUser.nome,
            sobrenome: editUser.sobrenome,
            regra: editUser.regra,
            is_master: editUser.regra === 'MASTER'
          })
          .eq("id", editUser.id);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Usuário atualizado com sucesso." });
        setIsEditDialogOpen(false);
        fetchUsers();
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erro", description: error.message });
      } finally {
        setLoading(false);
      }
    };
   const handleAddUser = async () => {
     setLoading(true);
     try {
       const { error } = await supabase.from("profiles").insert([{
         id: crypto.randomUUID(),
         nome: newUser.nome,
         sobrenome: newUser.sobrenome,
         email: newUser.email,
         regra: newUser.regra,
         ativo: true
       }]);
       if (error) throw error;
       toast({ title: "Sucesso", description: "Perfil de usuário criado." });
       setIsAddDialogOpen(false);
       fetchUsers();
     } catch (error: any) {
       toast({ variant: "destructive", title: "Erro", description: error.message });
     } finally {
       setLoading(false);
     }
   };
 
   const toggleStatus = async (user: any) => {
     const { error } = await supabase
       .from("profiles")
       .update({ ativo: !user.ativo })
       .eq("id", user.id);
 
     if (error) {
       toast({ variant: "destructive", title: "Erro", description: error.message });
     } else {
       toast({ title: "Sucesso", description: `Usuário ${user.ativo ? 'desativado' : 'ativado'} com sucesso!` });
       fetchUsers();
     }
   };
 
   const handleDeleteRequest = async (user: any) => {
     setSelectedUser(user);
     const { data: openTickets } = await supabase
       .from("chamados")
       .select("id")
       .eq("usuario_id", user.id)
       .in("status", ["ABERTO", "EM_ATENDIMENTO"]);
 
     if (openTickets && openTickets.length > 0) {
       setIsReassignDialogOpen(true);
     } else {
       if (confirm(`Deseja realmente excluir o usuário ${user.nome}?`)) {
         const { error } = await supabase.from("profiles").update({ deletado_em: new Date().toISOString(), ativo: false }).eq("id", user.id);
         if (error) toast({ variant: "destructive", title: "Erro", description: error.message });
         else {
           toast({ title: "Sucesso", description: "Usuário removido." });
           fetchUsers();
         }
       }
     }
   };
 
   const handleReassignAndDelete = async () => {
     if (!reassignToId) return;
     setLoading(true);
     try {
       await supabase.from("chamados").update({ usuario_id: reassignToId }).eq("usuario_id", selectedUser.id);
       await supabase.from("profiles").update({ deletado_em: new Date().toISOString(), ativo: false }).eq("id", selectedUser.id);
       toast({ title: "Sucesso", description: "Chamados remanejados e usuário removido." });
       setIsReassignDialogOpen(false);
       fetchUsers();
     } catch (error: any) {
       toast({ variant: "destructive", title: "Erro", description: error.message });
     } finally {
       setLoading(false);
     }
   };
 
 
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
            <p className="text-muted-foreground">Gerencie as permissões e perfis dos usuários do sistema.</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus size={18} /> Novo Usuário
          </Button>
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
                    <div className="flex justify-end gap-2">
                      <Select 
                        defaultValue={user.is_master ? 'MASTER' : user.regra} 
                        onValueChange={(value) => updateRole(user.id, value)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MASTER">Master</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="TECNICO">Técnico</SelectItem>
                          <SelectItem value="USUARIO">Usuário</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal size={18} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => {
                             setEditUser(user);
                             setIsEditDialogOpen(true);
                           }} className="gap-2">
                             <Pencil size={14} /> Editar
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => toggleStatus(user)} className="gap-2">
                             {user.ativo ? <PowerOff size={14} /> : <Power size={14} />}
                             {user.ativo ? 'Desativar' : 'Ativar'}
                           </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteRequest(user)} className="gap-2 text-destructive">
                            <Trash2 size={14} /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table>
        </div>
 
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={newUser.nome} onChange={e => setNewUser({...newUser, nome: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Sobrenome</Label>
                  <Input value={newUser.sobrenome} onChange={e => setNewUser({...newUser, sobrenome: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Permissão</Label>
                <Select value={newUser.regra} onValueChange={v => setNewUser({...newUser, regra: v as Regra})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MASTER">Master</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="TECNICO">Técnico</SelectItem>
                    <SelectItem value="USUARIO">Usuário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddUser} disabled={loading}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
 
         <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Editar Usuário</DialogTitle>
             </DialogHeader>
             {editUser && (
               <div className="space-y-4 py-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Nome</Label>
                     <Input value={editUser.nome} onChange={e => setEditUser({...editUser, nome: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                     <Label>Sobrenome</Label>
                     <Input value={editUser.sobrenome} onChange={e => setEditUser({...editUser, sobrenome: e.target.value})} />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <Label>E-mail</Label>
                   <Input type="email" value={editUser.email} disabled className="bg-muted" />
                 </div>
                 <div className="space-y-2">
                   <Label>Permissão</Label>
                   <Select value={editUser.regra} onValueChange={v => setEditUser({...editUser, regra: v as Regra})}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="MASTER">Master</SelectItem>
                       <SelectItem value="ADMIN">Administrador</SelectItem>
                       <SelectItem value="TECNICO">Técnico</SelectItem>
                       <SelectItem value="USUARIO">Usuário</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>
             )}
             <DialogFooter>
               <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
               <Button onClick={handleEditUser} disabled={loading}>Salvar Alterações</Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>

         <Dialog open={isReassignDialogOpen} onOpenChange={setIsReassignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remanejar Chamados em Aberto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                O usuário <strong>{selectedUser?.nome}</strong> possui chamados em aberto. 
                Selecione um novo responsável antes de removê-lo.
              </p>
              <div className="space-y-2">
                <Label>Novo Responsável</Label>
                <Select value={reassignToId} onValueChange={setReassignToId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.id !== selectedUser?.id && u.ativo).map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.nome} {u.sobrenome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReassignDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleReassignAndDelete} disabled={!reassignToId || loading} variant="destructive">
                Remanejar e Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }