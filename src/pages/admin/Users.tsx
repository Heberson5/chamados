import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
 import { UserPlus, User, Building2, Pencil, Save } from "lucide-react";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Checkbox } from "@/components/ui/checkbox";
 import { useToast } from "@/hooks/use-toast";
 
 const AdminUsers = () => {
   const [users, setUsers] = useState<any[]>([]);
   const [orgs, setOrgs] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [open, setOpen] = useState(false);
   const { toast } = useToast();
   const [newUser, setNewUser] = useState({
     full_name: "",
     email: "",
     organization_id: "",
     is_master: false
   });

   const load = async () => {
     const { data } = await supabase
       .from("profiles")
       .select("*, organizations(name), departments(name), positions(name)")
       .order("full_name");
     setUsers(data || []);
     
     const { data: o } = await supabase.from("organizations").select("id, name");
     setOrgs(o || []);
     
     setLoading(false);
   };
 
   useEffect(() => { load(); }, []);
 
   const createUser = async () => {
     if (!newUser.email || !newUser.full_name) return;
     // In a real app, we'd use an edge function to create the auth user too.
     // Here we'll just insert the profile or show a message.
     const { error } = await supabase.from("profiles").insert({
       ...newUser,
       id: crypto.randomUUID() // Fallback if not linked to auth yet
     });
     
     if (error) {
       toast({ variant: "destructive", title: "Erro", description: error.message });
     } else {
       toast({ title: "Sucesso", description: "Usuário cadastrado com sucesso." });
       setOpen(false);
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
                 <div className="flex items-center space-x-2">
                   <Checkbox 
                     id="is_master" 
                     checked={newUser.is_master} 
                     onCheckedChange={(v) => setNewUser({ ...newUser, is_master: !!v })}
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
              {users.map((u) => (
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
                  <TableCell>{u.is_master ? "Sim" : "Não"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <Pencil className="size-4" />
                    </Button>
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
