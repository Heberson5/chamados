import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { useToast } from "@/hooks/use-toast";
 import { Loader2, Shield, User as UserIcon, MoreHorizontal, Plus, Trash2, Power, PowerOff, Pencil, Camera, Headphones } from "lucide-react";
 import { Switch } from "@/components/ui/switch";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
 import { Database } from "@/integrations/supabase/types";
 import { getPasswordPolicy, validatePassword, describePolicy, type PasswordPolicy } from "@/lib/passwordPolicy";
 import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
 import { Check, X } from "lucide-react";
 
 type Regra = Database["public"]["Enums"]["regra"];
 
  export default function Users() {
    const navigate = useNavigate();
   const [users, setUsers] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const { toast } = useToast();
   const [selectedUser, setSelectedUser] = useState<any>(null);
   const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
   const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
   const [reassignToId, setReassignToId] = useState("");
   const [newUser, setNewUser] = useState({ nome: "", sobrenome: "", email: "", regra: "USUARIO" as Regra, telefone: "", ramal: "", cidade: "", password: "", avatar_url: "", pode_receber_chamados: false });
     const [createMode, setCreateMode] = useState<"password" | "invite">("password");
     const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editUser, setEditUser] = useState<any>(null);
    const [currentRole, setCurrentRole] = useState<{ regra: string; is_master: boolean } | null>(null);

    const isCurrentMaster = !!currentRole && (currentRole.is_master || currentRole.regra === "MASTER");

    const handleEditUser = async () => {
      if (!editUser) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("admin-update-user", {
          body: {
            user_id: editUser.id,
            nome: editUser.nome,
            sobrenome: editUser.sobrenome,
            email: editUser.email,
            regra: editUser.regra,
            telefone: editUser.telefone,
            ramal: editUser.ramal,
            cidade: editUser.cidade,
            avatar_url: editUser.avatar_url,
          },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
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
    if (!newUser.email || !newUser.nome) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Nome e e-mail são obrigatórios." });
      return;
    }
    if (createMode === "password") {
      if (!policy) return;
      const v = validatePassword(newUser.password, policy);
      if (!v.valid) {
        toast({ variant: "destructive", title: "Senha inválida", description: v.errors.join(", ") });
        return;
      }
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          mode: createMode,
          email: newUser.email,
          password: createMode === "password" ? newUser.password : undefined,
          nome: newUser.nome,
          sobrenome: newUser.sobrenome,
          regra: newUser.regra,
          telefone: newUser.telefone || undefined,
          ramal: newUser.ramal || undefined,
          cidade: newUser.cidade || undefined,
          avatar_url: newUser.avatar_url || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({
        title: "Usuário criado",
        description: createMode === "invite"
          ? "Convite enviado por e-mail."
          : "Usuário criado com senha temporária. Será solicitada a troca no primeiro login.",
      });
      setIsAddDialogOpen(false);
       setNewUser({ nome: "", sobrenome: "", email: "", regra: "USUARIO", telefone: "", ramal: "", cidade: "", password: "", avatar_url: "", pode_receber_chamados: false });
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
      getPasswordPolicy().then(setPolicy);
     (async () => {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
       const { data: prof } = await supabase
         .from("profiles")
         .select("regra, is_master")
         .eq("id", user.id)
         .single();
       if (prof) setCurrentRole({ regra: (prof as any).regra ?? "", is_master: !!(prof as any).is_master });
     })();
   }, []);
 
   const updateRole = async (userId: string, newRole: string) => {
    const { data, error } = await supabase.functions.invoke("admin-update-user", {
      body: { user_id: userId, regra: newRole },
    });
    if (error || (data as any)?.error) {
      const msg = (error as any)?.message ?? (data as any)?.error ?? "Erro";
      toast({ variant: "destructive", title: "Erro ao atualizar permissão", description: msg });
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
 
     const { hasPermission, loading: permsLoading } = usePermissions();

     useEffect(() => {
       if (!permsLoading && !hasPermission("usuarios")) {
         navigate("/dashboard");
       }
     }, [permsLoading, hasPermission, navigate]);

     if ((loading || permsLoading) && users.length === 0) {
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
             {users.filter(u => isCurrentMaster ? true : !(u.is_master || u.regra === "MASTER")).map((user) => (
               <TableRow key={user.id}>
                 <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs overflow-hidden border">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.nome} className="h-full w-full object-cover" />
                        ) : (
                          user.nome?.[0] || <UserIcon size={14} />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2">
                          {user.nome} {user.sobrenome}
                          {user.pode_receber_chamados && (
                            <Headphones className="h-3 w-3 text-primary" />
                          )}
                        </span>
                      </div>
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
                          {isCurrentMaster && <SelectItem value="MASTER">Master</SelectItem>}
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
            </DialogHeader>
            <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as any)} className="py-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password">Definir senha</TabsTrigger>
                <TabsTrigger value="invite">Enviar convite</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={newUser.telefone} onChange={e => setNewUser({...newUser, telefone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Ramal</Label>
                  <Input value={newUser.ramal} onChange={e => setNewUser({...newUser, ramal: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={newUser.cidade} onChange={e => setNewUser({...newUser, cidade: e.target.value})} />
              </div>
               <div className="flex items-center justify-between space-x-2 p-2 rounded-lg border bg-muted/20">
                 <div className="space-y-0.5">
                   <Label className="text-sm font-semibold flex items-center gap-2">
                     <Headphones className="h-4 w-4 text-primary" />
                     Gerenciar Chamados
                   </Label>
                   <p className="text-[10px] text-muted-foreground">
                     Permitir que este usuário receba chamados designados.
                   </p>
                 </div>
                 <Switch
                   checked={newUser.pode_receber_chamados}
                   onCheckedChange={(checked) => setNewUser({ ...newUser, pode_receber_chamados: checked })}
                 />
               </div>
               <div className="space-y-2">
                 <Label>Permissão</Label>
                 <Select value={newUser.regra} onValueChange={v => setNewUser({...newUser, regra: v as Regra})}>
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     {isCurrentMaster && <SelectItem value="MASTER">Master</SelectItem>}
                     <SelectItem value="ADMIN">Administrador</SelectItem>
                     <SelectItem value="TECNICO">Técnico</SelectItem>
                     <SelectItem value="USUARIO">Usuário</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
              {createMode === "password" && policy && (
                <div className="space-y-2">
                  <Label>Senha temporária</Label>
                  <Input
                    type="text"
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="O usuário trocará no primeiro login"
                  />
                  <div className="rounded-md border p-2 text-xs space-y-1 bg-muted/30">
                    {describePolicy(policy).map((rule, i) => {
                      const v = validatePassword(newUser.password, policy);
                      const ok = newUser.password.length > 0 && v.valid;
                      const ruleOk = newUser.password.length > 0 && !v.errors.some(e =>
                        (rule.startsWith("Mínimo") && e.startsWith("Mínimo")) ||
                        (rule === "Letra maiúscula" && e.includes("maiúscula")) ||
                        (rule === "Letra minúscula" && e.includes("minúscula")) ||
                        (rule === "Número" && e.includes("número")) ||
                        (rule === "Caractere especial" && e.includes("especial"))
                      );
                      return (
                        <div key={i} className="flex items-center gap-2">
                          {ruleOk ? <Check size={12} className="text-primary" /> : <X size={12} className="text-muted-foreground" />}
                          <span className={ruleOk ? "text-foreground" : "text-muted-foreground"}>{rule}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {createMode === "invite" && (
                <p className="text-sm text-muted-foreground">
                  Um link de convite será enviado por e-mail. O usuário definirá a própria senha ao acessar.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddUser} disabled={loading}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
 
         <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-lg">
             <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil size={18} className="text-primary" />
                Editar Usuário
              </DialogTitle>
             </DialogHeader>
             {editUser && (
                 <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
                  <div className="flex flex-col items-center justify-center space-y-2 pb-4">
                    <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary border-4 border-background shadow-lg overflow-hidden relative">
                      {editUser.avatar_url ? (
                        <img src={editUser.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <UserIcon size={48} />
                      )}
                      {loading && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-center">
                      <Label htmlFor="avatar-upload" className="cursor-pointer text-xs text-primary hover:underline flex items-center gap-1">
                        <Camera size={12} /> Alterar foto
                      </Label>
                      <Input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setLoading(true);
                          try {
                            const ext = file.name.split(".").pop();
                            const path = `${editUser.id}/avatar.${ext}`;
                            const { error: upErr } = await supabase.storage
                              .from("ticket-attachments")
                              .upload(path, file, { upsert: true, cacheControl: "3600" });
                            if (upErr) throw upErr;
                            const { data: pub } = supabase.storage.from("ticket-attachments").getPublicUrl(path);
                            const url = `${pub.publicUrl}?t=${Date.now()}`;
                            setEditUser({ ...editUser, avatar_url: url });
                            toast({ title: "Foto carregada", description: "Clique em Salvar para confirmar." });
                          } catch (err: any) {
                            toast({ variant: "destructive", title: "Erro ao carregar foto", description: err.message });
                          } finally {
                            setLoading(false);
                          }
                        }}
                      />
                      {editUser.avatar_url && (
                        <button
                          type="button"
                          onClick={() => setEditUser({ ...editUser, avatar_url: null })}
                          className="text-[10px] text-destructive hover:underline mt-1"
                        >
                          Remover foto
                        </button>
                      )}
                    </div>
                  </div>

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
                  <Input
                    type="email"
                    value={editUser.email}
                    onChange={e => setEditUser({ ...editUser, email: e.target.value })}
                  />
                 </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input value={editUser.telefone || ""} onChange={e => setEditUser({...editUser, telefone: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Ramal</Label>
                      <Input value={editUser.ramal || ""} onChange={e => setEditUser({...editUser, ramal: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={editUser.cidade || ""} onChange={e => setEditUser({...editUser, cidade: e.target.value})} />
                  </div>
                   <div className="flex items-center justify-between space-x-2 p-3 rounded-lg border bg-muted/20">
                     <div className="space-y-0.5">
                       <Label className="text-sm font-semibold flex items-center gap-2">
                         <Headphones className="h-4 w-4 text-primary" />
                         Gerenciar Chamados
                       </Label>
                       <p className="text-[10px] text-muted-foreground">
                         Permitir que este usuário receba chamados designados.
                       </p>
                     </div>
                     <Switch
                       checked={editUser.pode_receber_chamados}
                       onCheckedChange={(checked) => setEditUser({ ...editUser, pode_receber_chamados: checked })}
                     />
                   </div>
                   <div className="space-y-2">
                     <Label>Permissão</Label>
                     <Select value={editUser.regra} onValueChange={v => setEditUser({...editUser, regra: v as Regra})}>
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         {isCurrentMaster && <SelectItem value="MASTER">Master</SelectItem>}
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