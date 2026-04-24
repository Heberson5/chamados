import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Briefcase, Network, Pencil, Trash2 } from "lucide-react";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { useToast } from "@/hooks/use-toast";
 
 const AdminStructure = () => {
   const [depts, setDepts] = useState<any[]>([]);
   const [positions, setPositions] = useState<any[]>([]);
   const [orgs, setOrgs] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [openDepto, setOpenDepto] = useState(false);
   const [openCargo, setOpenCargo] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string, name: string, organization_id: string, type: "departments" | "positions" } | null>(null);
   const { toast } = useToast();
   
   const [newItem, setNewItem] = useState({ name: "", organization_id: "" });

   const load = async () => {
     const { data: d } = await supabase.from("departments").select("*, organizations(name)").order("name");
     const { data: p } = await supabase.from("positions").select("*, organizations(name)").order("name");
     const { data: o } = await supabase.from("organizations").select("id, name").order("name");
     setDepts(d || []);
     setPositions(p || []);
     setOrgs(o || []);
     setLoading(false);
   };
 
   const createItem = async (table: "departments" | "positions") => {
     if (!newItem.name || !newItem.organization_id) return;
     const { error } = await supabase.from(table).insert(newItem);
     if (error) {
       toast({ variant: "destructive", title: "Erro", description: error.message });
     } else {
       toast({ title: "Sucesso", description: "Item criado com sucesso." });
       setOpenDepto(false);
       setOpenCargo(false);
       setNewItem({ name: "", organization_id: "" });
       load();
     }
   };

  const handleEdit = (item: any, type: "departments" | "positions") => {
    setEditingItem({
      id: item.id,
      name: item.name,
      organization_id: item.organization_id,
      type
    });
    setEditOpen(true);
  };

  const updateItem = async () => {
    if (!editingItem || !editingItem.name || !editingItem.organization_id) return;
    
    const { error } = await supabase
      .from(editingItem.type)
      .update({
        name: editingItem.name,
        organization_id: editingItem.organization_id
      })
      .eq("id", editingItem.id);

    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      toast({ title: "Sucesso", description: "Item atualizado com sucesso." });
      setEditOpen(false);
      setEditingItem(null);
      load();
    }
  };

  const deleteItem = async (id: string, table: "departments" | "positions") => {
    if (!confirm("Excluir este item?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      toast({ title: "Sucesso", description: "Item removido." });
      load();
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Estrutura Organizacional" 
        description="Gerencie departamentos e cargos das empresas."
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {editingItem?.type === "departments" ? "Departamento" : "Cargo"}</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input 
                  value={editingItem.name} 
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select 
                  value={editingItem.organization_id} 
                  onValueChange={(v) => setEditingItem({ ...editingItem, organization_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {orgs.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={updateItem}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="p-6">
        <Tabs defaultValue="departments">
          <TabsList className="mb-4">
            <TabsTrigger value="departments" className="gap-2"><Network className="size-4" /> Departamentos</TabsTrigger>
            <TabsTrigger value="positions" className="gap-2"><Briefcase className="size-4" /> Cargos</TabsTrigger>
          </TabsList>
          
           <TabsContent value="departments" className="space-y-4">
             <div className="flex justify-between items-center">
               <h3 className="text-lg font-medium">Lista de Departamentos</h3>
               <Dialog open={openDepto} onOpenChange={setOpenDepto}>
                 <DialogTrigger asChild>
                   <Button size="sm" className="gap-2"><Plus className="size-4" /> Novo Depto</Button>
                 </DialogTrigger>
                 <DialogContent>
                   <DialogHeader>
                     <DialogTitle>Novo Departamento</DialogTitle>
                   </DialogHeader>
                   <div className="space-y-4 py-4">
                     <div className="space-y-2">
                       <Label>Nome</Label>
                       <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
                     </div>
                     <div className="space-y-2">
                       <Label>Empresa</Label>
                       <Select value={newItem.organization_id} onValueChange={(v) => setNewItem({ ...newItem, organization_id: v })}>
                         <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                         <SelectContent>
                           {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                   <DialogFooter>
                     <Button onClick={() => createItem("departments")}>Criar</Button>
                   </DialogFooter>
                 </DialogContent>
               </Dialog>
             </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {depts.map((d) => (
                <Card key={d.id}>
                   <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                     <div>
                    <CardTitle className="text-sm font-medium">{d.name}</CardTitle>
                    <CardDescription className="text-xs">{d.organizations?.name}</CardDescription>
                     </div>
                     <div className="flex gap-1">
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(d, "departments")}>
                         <Pencil className="size-3.5" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem(d.id, "departments")}>
                         <Trash2 className="size-3.5" />
                       </Button>
                     </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

           <TabsContent value="positions" className="space-y-4">
             <div className="flex justify-between items-center">
               <h3 className="text-lg font-medium">Lista de Cargos</h3>
               <Dialog open={openCargo} onOpenChange={setOpenCargo}>
                 <DialogTrigger asChild>
                   <Button size="sm" className="gap-2"><Plus className="size-4" /> Novo Cargo</Button>
                 </DialogTrigger>
                 <DialogContent>
                   <DialogHeader>
                     <DialogTitle>Novo Cargo</DialogTitle>
                   </DialogHeader>
                   <div className="space-y-4 py-4">
                     <div className="space-y-2">
                       <Label>Nome</Label>
                       <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
                     </div>
                     <div className="space-y-2">
                       <Label>Empresa</Label>
                       <Select value={newItem.organization_id} onValueChange={(v) => setNewItem({ ...newItem, organization_id: v })}>
                         <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                         <SelectContent>
                           {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                   <DialogFooter>
                     <Button onClick={() => createItem("positions")}>Criar</Button>
                   </DialogFooter>
                 </DialogContent>
               </Dialog>
             </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {positions.map((p) => (
                <Card key={p.id}>
                   <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                     <div>
                    <CardTitle className="text-sm font-medium">{p.name}</CardTitle>
                    <CardDescription className="text-xs">{p.organizations?.name}</CardDescription>
                     </div>
                     <div className="flex gap-1">
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(p, "positions")}>
                         <Pencil className="size-3.5" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem(p.id, "positions")}>
                         <Trash2 className="size-3.5" />
                       </Button>
                     </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminStructure;
