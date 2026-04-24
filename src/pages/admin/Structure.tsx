import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Briefcase, Network } from "lucide-react";
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

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Estrutura Organizacional" 
        description="Gerencie departamentos e cargos das empresas."
      />
      
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
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">{d.name}</CardTitle>
                    <CardDescription className="text-xs">{d.organizations?.name}</CardDescription>
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
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">{p.name}</CardTitle>
                    <CardDescription className="text-xs">{p.organizations?.name}</CardDescription>
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
