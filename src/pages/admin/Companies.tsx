import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Building2, Pencil, Trash2 } from "lucide-react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { useToast } from "@/hooks/use-toast";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
 } from "@/components/ui/dialog";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 
 type Org = { id: string; name: string; slug: string; created_at: string; user_count?: number };

const AdminCompanies = () => {
   const [companies, setCompanies] = useState<Org[]>([]);
   const [loading, setLoading] = useState(true);
   const [open, setOpen] = useState(false);
   const [newOrg, setNewOrg] = useState({ name: "", slug: "" });
   const { toast } = useToast();
 
   const load = async () => {
     const { data: orgs } = await supabase.from("organizations").select("*").order("name");
     if (orgs) {
       const { data: profiles } = await supabase
         .from("profiles")
         .select("organization_id, is_master")
         .eq("is_master", false);
       
       const enriched = orgs.map(o => ({
         ...o,
         user_count: profiles?.filter(p => p.organization_id === o.id).length || 0
       }));
       setCompanies(enriched);
     }
     setLoading(false);
   };

   useEffect(() => { load(); }, []);
 
   const createCompany = async () => {
     if (!newOrg.name || !newOrg.slug) return;
     const { error } = await supabase.from("organizations").insert(newOrg);
     if (error) {
       toast({ variant: "destructive", title: "Erro", description: error.message });
     } else {
       toast({ title: "Sucesso", description: "Empresa criada com sucesso." });
       setOpen(false);
       setNewOrg({ name: "", slug: "" });
       load();
     }
   };
 
   const deleteCompany = async (id: string) => {
     if (!confirm("Tem certeza que deseja excluir esta empresa? Todos os dados vinculados serão mantidos (se houver restrições) ou removidos.")) return;
     const { error } = await supabase.from("organizations").delete().eq("id", id);
     if (error) {
       toast({ variant: "destructive", title: "Erro", description: error.message });
     } else {
       toast({ title: "Sucesso", description: "Empresa removida." });
       load();
     }
   };
 
   return (
     <div className="space-y-6">
       <PageHeader 
         title="Gestão de Empresas" 
         description="Visualize e gerencie todas as empresas cadastradas no sistema."
         actions={
           <Dialog open={open} onOpenChange={setOpen}>
             <DialogTrigger asChild>
               <Button size="sm" className="gap-2">
                 <Plus className="size-4" /> Nova Empresa
               </Button>
             </DialogTrigger>
             <DialogContent>
               <DialogHeader>
                 <DialogTitle>Nova Empresa</DialogTitle>
                 <DialogDescription>Cadastre uma nova empresa no sistema.</DialogDescription>
               </DialogHeader>
               <div className="space-y-4 py-4">
                 <div className="space-y-2">
                   <Label htmlFor="name">Nome da Empresa</Label>
                   <Input 
                     id="name" 
                     value={newOrg.name} 
                     onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} 
                     placeholder="Ex: Empresa ABC"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="slug">Slug (URL)</Label>
                   <Input 
                     id="slug" 
                     value={newOrg.slug} 
                     onChange={(e) => setNewOrg({ ...newOrg, slug: e.target.value.toLowerCase().replace(/ /g, "-") })} 
                     placeholder="ex-empresa-abc"
                   />
                 </div>
               </div>
               <DialogFooter>
                 <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                 <Button onClick={createCompany}>Criar Empresa</Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>
         }
       />
      
      <div className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <Card key={company.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{company.name}</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
             <CardContent>
               <div className="text-xs text-muted-foreground mb-1">Slug: {company.slug}</div>
               <div className="text-xs text-muted-foreground mb-4 font-medium">Usuários: {company.user_count}</div>
               <div className="flex gap-2">
                <Button variant="outline" size="sm" className="w-full gap-1">
                  <Pencil className="size-3" /> Editar
                </Button>
                 <Button 
                   variant="outline" 
                   size="sm" 
                   className="w-full gap-1 text-destructive hover:text-destructive"
                   onClick={() => deleteCompany(company.id)}
                 >
                   <Trash2 className="size-3" /> Excluir
                 </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {companies.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Nenhuma empresa cadastrada.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCompanies;
