import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
 import { UserPlus, User, Building2, Pencil, Save, Trash2, Shield } from "lucide-react";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Checkbox } from "@/components/ui/checkbox";
  import { useToast } from "@/hooks/use-toast";
  import { useAuth } from "@/hooks/useAuth";
 
 const AdminUsers = () => {
   const [users, setUsers] = useState<any[]>([]);
   const [orgs, setOrgs] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
    const { toast } = useToast();
    const { profile: currentUserProfile } = useAuth();
    const [newUser, setNewUser] = useState({
      full_name: "",
      email: "",
      organization_id: "",
      is_master: false,
      department_id: "",
      position_id: "",
      role: "customer" as "admin" | "agent" | "customer"
    });

   const load = async () => {
     const { data } = await supabase
       .from("profiles")
       .select("*, organizations(name), departments(name), positions(name), user_roles(role)")
       .order("full_name");
     setUsers(data || []);
     
     const { data: o } = await supabase.from("organizations").select("id, name");
     setOrgs(o || []);

    const { data: d } = await supabase.from("departments").select("id, name, organization_id");
    setDepts(d || []);

    const { data: p } = await supabase.from("positions").select("id, name, organization_id");
    setPositions(p || []);
     
     setLoading(false);
   };
 
   useEffect(() => { load(); }, []);
 
   const createUser = async () => {
     if (!newUser.email || !newUser.full_name) return;
     
     const userId = crypto.randomUUID();
     const { role, ...profileData } = newUser;
 
     const { error: profileError } = await supabase.from("profiles").insert({
       ...profileData,
       id: userId,
       organization_id: profileData.organization_id || null,
       department_id: profileData.department_id || null,
       position_id: profileData.position_id || null,
     } as any);
     
     if (profileError) {
       toast({ variant: "destructive", title: "Erro ao criar perfil", description: profileError.message });
       return;
     }
 
     if (newUser.organization_id && !newUser.is_master) {
       await supabase.from("user_roles").insert({
         user_id: userId,
         organization_id: newUser.organization_id,
         role: role
       });
     }
     
     toast({ title: "Sucesso", description: "Usuário cadastrado com sucesso." });
     setOpen(false);
     load();
   };
 
  const handleEdit = (user: any) => {
    setEditingUser({
      ...user,
      organization_id: user.organization_id || "",
      department_id: user.department_id || "",
       position_id: user.position_id || "",
       role: user.user_roles?.[0]?.role || "customer"
    });
    setEditOpen(true);
  };

  const updateUser = async () => {
    if (!editingUser || !editingUser.full_name) return;
    
     const { role, ...profileData } = editingUser;

    const { error } = await supabase
      .from("profiles")
      .update({
         full_name: profileData.full_name,
         organization_id: profileData.organization_id || null,
         department_id: profileData.department_id || null,
         position_id: profileData.position_id || null,
         is_master: profileData.is_master
      })
       .eq("id", profileData.id);

     if (!error && editingUser.organization_id && !editingUser.is_master) {
       // Update or insert role
       const { data: existingRole } = await supabase
         .from("user_roles")
         .select("id")
         .eq("user_id", editingUser.id)
         .maybeSingle();

       if (existingRole) {
         await supabase
           .from("user_roles")
           .update({ role, organization_id: editingUser.organization_id })
           .eq("id", existingRole.id);
       } else {
         await supabase
           .from("user_roles")
           .insert({ user_id: editingUser.id, role, organization_id: editingUser.organization_id });
       }
     }

    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      toast({ title: "Sucesso", description: "Usuário atualizado com sucesso." });
      setEditOpen(false);
      setEditingUser(null);
      load();
    }
  };

   const deleteUser = async (id: string) => {
     if (!confirm("Excluir este usuário?")) return;
     const { error } = await supabase.from("profiles").delete().eq("id", id);
     if (error) {
       toast({ variant: "destructive", title: "Erro", description: error.message });
     } else {
       toast({ title: "Sucesso", description: "Usuário removido." });
       load();
     }
   };

  return (
    <div className="space-y-6">
       <PageHeader 
         title="Usuários" 
         description="Gerencie usuários de todas as empresas e seus acessos."
         actions={
           <Dialog open={open} onOpenChange={setOpen}>
             <DialogTrigger asChild>
               <Button size="sm" className="gap-2">
                 <UserPlus className="size-4" /> Novo Usuário
               </Button>
             </DialogTrigger>
             <DialogContent>
               <DialogHeader>
                 <DialogTitle>Novo Usuário</DialogTitle>
                 <DialogDescription>Cadastre um novo usuário no sistema.</DialogDescription>
               </DialogHeader>
               <div className="space-y-4 py-4">
                 <div className="space-y-2">
                   <Label htmlFor="full_name">Nome Completo</Label>
                   <Input 
                     id="full_name" 
                     value={newUser.full_name} 
                     onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} 
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="email">E-mail</Label>
                   <Input 
                     id="email" 
                     type="email"
                     value={newUser.email} 
                     onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} 
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Empresa</Label>
                   <Select 
                     value={newUser.organization_id} 
                      onValueChange={(v) => setNewUser({ ...newUser, organization_id: v })}
                      disabled={newUser.is_master}
                    >
                     <SelectTrigger>
                       <SelectValue placeholder="Selecione a empresa" />
                     </SelectTrigger>
                     <SelectContent>
                       {orgs.map(o => (
                         <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select 
                    value={newUser.department_id} 
                    onValueChange={(v) => setNewUser({ ...newUser, department_id: v })}
                    disabled={!newUser.organization_id || newUser.is_master}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {depts.filter(d => d.organization_id === newUser.organization_id).map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Select 
                    value={newUser.position_id} 
                    onValueChange={(v) => setNewUser({ ...newUser, position_id: v })}
                    disabled={!newUser.organization_id || newUser.is_master}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {positions.filter(p => p.organization_id === newUser.organization_id).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
                  <div className="space-y-2">
                    <Label>Nível de Acesso</Label>
                    <Select 
                      value={newUser.role} 
                      onValueChange={(v) => setNewUser({ ...newUser, role: v as any })}
                      disabled={newUser.is_master}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione o nível" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="agent">Agente / Suporte</SelectItem>
                        <SelectItem value="customer">Usuário (Solicitante)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                   <Checkbox 
                     id="is_master" 
                     checked={newUser.is_master} 
                     onCheckedChange={(v) => {
                       const val = !!v;
                       setNewUser({ 
                         ...newUser, 
                         is_master: val,
                         organization_id: val ? "" : newUser.organization_id,
                         department_id: val ? "" : newUser.department_id,
                         position_id: val ? "" : newUser.position_id
                       });
                     }}
                     disabled={!currentUserProfile?.is_master}
                   />
                   <Label htmlFor="is_master">Usuário Master (Acesso total)</Label>
                 </div>
               </div>
               <DialogFooter>
                 <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                 <Button onClick={createUser}>Cadastrar</Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>
         }
       />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Altere as informações do usuário selecionado.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_full_name">Nome Completo</Label>
                <Input 
                  id="edit_full_name" 
                  value={editingUser.full_name} 
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                  <Select 
                    value={editingUser.organization_id} 
                    onValueChange={(v) => setEditingUser({ ...editingUser, organization_id: v })}
                    disabled={editingUser.is_master}
                  >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select 
                    value={editingUser.department_id} 
                    onValueChange={(v) => setEditingUser({ ...editingUser, department_id: v })}
                    disabled={!editingUser.organization_id || editingUser.is_master}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {depts.filter(d => d.organization_id === editingUser.organization_id).map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Select 
                    value={editingUser.position_id} 
                    onValueChange={(v) => setEditingUser({ ...editingUser, position_id: v })}
                    disabled={!editingUser.organization_id || editingUser.is_master}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {positions.filter(p => p.organization_id === editingUser.organization_id).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nível de Acesso</Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(v) => setEditingUser({ ...editingUser, role: v as any })}
                  disabled={editingUser.is_master}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o nível" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="agent">Agente / Suporte</SelectItem>
                    <SelectItem value="customer">Usuário (Solicitante)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="edit_is_master" 
                  checked={editingUser.is_master} 
                  onCheckedChange={(v) => {
                    const val = !!v;
                    setEditingUser({ 
                      ...editingUser, 
                      is_master: val,
                      organization_id: val ? "" : editingUser.organization_id,
                      department_id: val ? "" : editingUser.department_id,
                      position_id: val ? "" : editingUser.position_id
                    });
                  }}
                  disabled={!currentUserProfile?.is_master}
                />
                <Label htmlFor="edit_is_master">Usuário Master (Acesso total)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={updateUser}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="p-6">
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Depto / Cargo</TableHead>
                <TableHead>Master?</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.filter(u => {
                if (!currentUserProfile?.is_master && u.is_master) return false;
                return true;
              }).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-secondary grid place-items-center text-xs">
                        {u.full_name?.[0] ?? "U"}
                      </div>
                      <div>
                        <div>{u.full_name || "Sem nome"}</div>
                        <div className="text-[11px] text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{u.organizations?.name || "—"}</TableCell>
                  <TableCell>
                    <div className="text-xs">{u.departments?.name || "—"}</div>
                    <div className="text-[11px] text-muted-foreground">{u.positions?.name || "—"}</div>
                  </TableCell>
                  <TableCell>
                    {u.is_master ? (
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <Shield className="size-3" /> Sim
                      </span>
                    ) : "Não"}
                  </TableCell>
                   <TableCell className="text-right">
                     <div className="flex justify-end gap-1">
                       <Button 
                         variant="ghost" 
                         size="icon"
                         onClick={() => handleEdit(u)}
                       >
                         <Pencil className="size-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteUser(u.id)}>
                         <Trash2 className="size-4" />
                       </Button>
                     </div>
                   </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
