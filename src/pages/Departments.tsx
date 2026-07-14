 import { useEffect, useState } from "react";
 import { useNavigate } from "react-router-dom";
 import { usePermissions } from "@/hooks/usePermissions";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { useToast } from "@/hooks/use-toast";
 import { Loader2, Building2, Plus, Trash2, Pencil } from "lucide-react";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import AccessScheduleEditor from "@/components/AccessScheduleEditor";
import { useSortableTable, useColumnVisibility } from "@/hooks/useSortableTable";
import { SortableTableHead } from "@/components/SortableTableHead";
import { ColumnVisibilityMenu, type ColumnDef } from "@/components/ColumnVisibilityMenu";
 
 export default function Departments() {
   const navigate = useNavigate();
   const [departments, setDepartments] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const { toast } = useToast();
   const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
   const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
   const [newDept, setNewDept] = useState({ nome: "", descricao: "" });
  const [editDept, setEditDept] = useState<any>(null);
  const [newDeptSched, setNewDeptSched] = useState<any>(null);
 
    const fetchDepartments = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id, is_master, regra")
          .eq("id", user.id)
          .maybeSingle();

        const isMaster = !!profile?.is_master || profile?.regra === "MASTER";
        
        let query = supabase.from("departamentos").select("*");
        
        // Se for Master, vê todos os departamentos. 
        // Se não for Master, vê apenas os da sua organização.
        if (!isMaster) {
          if (profile?.organization_id) {
            query = query.eq("organization_id", profile.organization_id);
          } else {
            // Se não tem organização e não é master, só vê os globais
            query = query.is("organization_id", null);
          }
        }

        const { data, error } = await query.order("nome");
        
        if (error) {
          console.error("Error fetching departments:", error);
          toast({ 
            variant: "destructive", 
            title: "Erro ao buscar departamentos", 
            description: error.message 
          });
        } else {
          setDepartments(data || []);
        }
      } catch (err: any) {
        console.error("Unexpected error fetching departments:", err);
        toast({ 
          variant: "destructive", 
          title: "Erro inesperado", 
          description: err.message 
        });
      } finally {
        setLoading(false);
      }
    };
 
   useEffect(() => {
     fetchDepartments();
   }, []);
 
   const handleAddDept = async () => {
     if (!newDept.nome) {
       toast({ variant: "destructive", title: "Campo obrigatório", description: "O nome é obrigatório." });
       return;
     }
 
     const { data: { user } } = await supabase.auth.getUser();
     const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user?.id).single();
 
     const { error } = await supabase.from("departamentos").insert({
       nome: newDept.nome,
       descricao: newDept.descricao,
      organization_id: profile?.organization_id,
      access_schedule: newDeptSched
     });
 
     if (error) {
       toast({ variant: "destructive", title: "Erro", description: error.message });
     } else {
       toast({ title: "Sucesso", description: "Departamento criado com sucesso." });
       setIsAddDialogOpen(false);
       setNewDept({ nome: "", descricao: "" });
      setNewDeptSched(null);
       fetchDepartments();
     }
   };
 
   const handleEditDept = async () => {
     if (!editDept.nome) return;
     const { error } = await supabase.from("departamentos").update({
       nome: editDept.nome,
      descricao: editDept.descricao,
      access_schedule: editDept.access_schedule || null
     }).eq("id", editDept.id);
 
     if (error) {
       toast({ variant: "destructive", title: "Erro", description: error.message });
     } else {
       toast({ title: "Sucesso", description: "Departamento atualizado." });
       setIsEditDialogOpen(false);
       fetchDepartments();
     }
   };
 
   const handleDeleteDept = async (id: string) => {
     if (!confirm("Deseja realmente excluir este departamento? Usuários vinculados ficarão sem departamento.")) return;
     
     const { error } = await supabase.from("departamentos").delete().eq("id", id);
     if (error) {
       toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir. Pode haver registros vinculados." });
     } else {
       toast({ title: "Sucesso", description: "Departamento removido." });
       fetchDepartments();
     }
   };
 
   const { hasPermission, loading: permsLoading } = usePermissions();
 
   useEffect(() => {
     if (!permsLoading && !hasPermission("configuracoes")) {
       navigate("/dashboard");
     }
   }, [permsLoading, hasPermission, navigate]);

   const listColumns: ColumnDef[] = [
     { key: "id", label: "ID" },
     { key: "nome", label: "Nome" },
     { key: "descricao", label: "Descrição" },
   ];
   const { isVisible: isColVisible, toggle: toggleColumn } = useColumnVisibility(listColumns.map(c => c.key));
   const getSortValue = (d: any, key: string) => {
     switch (key) {
       case "id": return d.sequencial_id ?? 0;
       case "nome": return d.nome || "";
       case "descricao": return d.descricao || "";
       default: return "";
     }
   };
   const { sortedData: sortedDepartments, sortKey, sortDirection, requestSort } = useSortableTable(departments, getSortValue);

   if (loading || permsLoading) {
     return (
       <div className="flex h-[50vh] items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
 
   return (
     <div className="p-4 md:p-8 w-full space-y-6 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
           <h1 className="text-3xl font-bold tracking-tight">Departamentos</h1>
           <p className="text-muted-foreground">Gerencie os departamentos da organização.</p>
         </div>
         <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
           <Plus size={18} /> Novo Departamento
         </Button>
       </div>
 
       <div className="flex justify-start mb-2">
         <ColumnVisibilityMenu columns={listColumns} isVisible={isColVisible} onToggle={toggleColumn} />
       </div>
       <div className="bg-card rounded-md border shadow-sm">
         <Table>
           <TableHeader>
              <TableRow>
                {isColVisible("id") && <SortableTableHead label="ID" sortKey="id" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} className="w-16" />}
               {isColVisible("nome") && <SortableTableHead label="Nome" sortKey="nome" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
               {isColVisible("descricao") && <SortableTableHead label="Descrição" sortKey="descricao" currentSortKey={sortKey} direction={sortDirection} onSort={requestSort} />}
               <TableHead className="text-right">Ações</TableHead>
             </TableRow>
           </TableHeader>
            <TableBody>
              {sortedDepartments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={listColumns.filter(c => isColVisible(c.key)).length + 1} className="text-center py-10 text-muted-foreground">
                    Nenhum departamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                sortedDepartments.map((dept) => (
                  <TableRow key={dept.id}>
                    {isColVisible("id") && <TableCell className="text-xs font-mono text-muted-foreground">
                      {dept.sequencial_id}
                    </TableCell>}
                    {isColVisible("nome") && <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-muted-foreground" />
                        {dept.nome}
                      </div>
                    </TableCell>}
                    {isColVisible("descricao") && <TableCell>{dept.descricao || "-"}</TableCell>}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditDept(dept); setIsEditDialogOpen(true); }}>
                          <Pencil size={18} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDept(dept.id)} className="text-destructive">
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
         </Table>
       </div>
 
       <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
         <DialogContent>
           <DialogHeader><DialogTitle>Novo Departamento</DialogTitle></DialogHeader>
           <div className="space-y-4 py-2">
             <div className="space-y-2">
               <Label>Nome</Label>
               <Input value={newDept.nome} onChange={e => setNewDept({ ...newDept, nome: e.target.value })} placeholder="Ex: Financeiro" />
             </div>
             <div className="space-y-2">
               <Label>Descrição</Label>
               <Input value={newDept.descricao} onChange={e => setNewDept({ ...newDept, descricao: e.target.value })} />
             </div>
            <AccessScheduleEditor value={newDeptSched} onChange={setNewDeptSched} />
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
             <Button onClick={handleAddDept}>Salvar</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
         <DialogContent>
           <DialogHeader><DialogTitle>Editar Departamento</DialogTitle></DialogHeader>
           {editDept && (
             <div className="space-y-4 py-2">
               <div className="space-y-2">
                 <Label>Nome</Label>
                 <Input value={editDept.nome} onChange={e => setEditDept({ ...editDept, nome: e.target.value })} />
               </div>
               <div className="space-y-2">
                 <Label>Descrição</Label>
                 <Input value={editDept.descricao} onChange={e => setEditDept({ ...editDept, descricao: e.target.value })} />
               </div>
              <AccessScheduleEditor value={editDept.access_schedule} onChange={(v) => setEditDept({ ...editDept, access_schedule: v })} />
             </div>
           )}
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
             <Button onClick={handleEditDept}>Atualizar</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 }