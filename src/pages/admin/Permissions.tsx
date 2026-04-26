import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Lock, ShieldCheck, Plus, Search, Edit2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const MODULES = [
  { id: "tickets", name: "Chamados" },
  { id: "users", name: "Usuários" },
  { id: "departments", name: "Departamentos" },
  { id: "companies", name: "Empresas" },
  { id: "audit_logs", name: "Logs de Auditoria" },
  { id: "settings", name: "Configurações" },
];

const Permissions = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptOrgId, setNewDeptOrgId] = useState("");

  const { data: departments, isLoading: isLoadingDepts } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*, organizations(name)")
        .order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: organizations } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("id, name");
      if (error) throw error;
      return data;
    },
  });

  const { data: allPermissions, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ["all-department-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("department_permissions").select("*");
      if (error) throw error;
      return data;
    },
  });

  const createDeptMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .insert({ name: newDeptName, organization_id: newDeptOrgId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Departamento criado com sucesso");
      setIsCreateDialogOpen(false);
      setNewDeptName("");
    },
    onError: (error: any) => toast.error("Erro ao criar: " + error.message),
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async (vars: { module: string, field: string, value: boolean }) => {
      const existing = allPermissions?.find(p => p.department_id === selectedDeptId && p.module_name === vars.module);
      
      const payload: any = { [vars.field]: vars.value };
      
      if (existing) {
        const { error } = await supabase
          .from("department_permissions")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("department_permissions")
          .insert({
            department_id: selectedDeptId,
            module_name: vars.module,
            ...payload
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-department-permissions"] });
      toast.success("Permissão atualizada com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar permissão: " + error.message);
    }
  });

  const handleToggle = (module: string, field: string, value: boolean) => {
    updatePermissionMutation.mutate({ module, field, value });
  };

  const getPermission = (deptId: string, module: string, field: string) => {
    const p = allPermissions?.find(perm => perm.department_id === deptId && perm.module_name === module);
    return p ? p[field] : false;
  };

  const getDeptPermissionsSummary = (deptId: string) => {
    const perms = allPermissions?.filter(p => p.department_id === deptId && p.can_view);
    if (!perms || perms.length === 0) return "Nenhuma permissão concedida";
    
    return perms.map(p => {
      const mod = MODULES.find(m => m.id === p.module_name);
      return mod ? mod.name : p.module_name;
    }).join(", ");
  };

  const filteredDepartments = departments?.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedDept = departments?.find(d => d.id === selectedDeptId);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Lock className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestão de Permissões</h1>
            <p className="text-muted-foreground text-sm">Configure níveis de acesso por departamento ou função</p>
          </div>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" /> Novo Grupo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Grupo de Permissões</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Grupo / Departamento</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: Financeiro, RH, Suporte..." 
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org">Empresa</Label>
                <Select value={newDeptOrgId} onValueChange={setNewDeptOrgId}>
                  <SelectTrigger id="org">
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations?.map(org => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => createDeptMutation.mutate()} disabled={!newDeptName || !newDeptOrgId}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar departamentos..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoadingDepts || isLoadingPermissions ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDepartments?.map((dept) => {
            const summary = getDeptPermissionsSummary(dept.id);
            const hasPermissions = summary !== "Nenhuma permissão concedida";
            
            return (
              <Card key={dept.id} className="group hover:border-primary/50 transition-all cursor-pointer overflow-hidden flex flex-col" onClick={() => {
                setSelectedDeptId(dept.id);
                setIsEditDialogOpen(true);
              }}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{dept.name}</CardTitle>
                      <CardDescription>{dept.organizations?.name || "Empresa não informada"}</CardDescription>
                    </div>
                    <div className="p-2 rounded-full bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <ShieldCheck className="size-5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="space-y-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acessos:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {hasPermissions ? (
                        allPermissions?.filter(p => p.department_id === dept.id && p.can_view).slice(0, 4).map(p => {
                          const mod = MODULES.find(m => m.id === p.module_name);
                          return (
                            <Badge key={p.id} variant="secondary" className="text-[10px] font-normal px-2 py-0">
                              {mod?.name || p.module_name}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Nenhum acesso configurado</span>
                      )}
                      {allPermissions?.filter(p => p.department_id === dept.id && p.can_view).length > 4 && (
                        <Badge variant="outline" className="text-[10px] font-normal px-2 py-0">
                          +{allPermissions.filter(p => p.department_id === dept.id && p.can_view).length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-3 border-t bg-muted/30">
                  <Button variant="ghost" size="sm" className="w-full justify-between font-normal text-xs">
                    Configurar permissões
                    <Edit2 className="size-3" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              Editar Permissões: {selectedDept?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[200px]">Módulo</TableHead>
                    <TableHead className="text-center">Visualizar</TableHead>
                    <TableHead className="text-center">Criar</TableHead>
                    <TableHead className="text-center">Editar</TableHead>
                    <TableHead className="text-center">Excluir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MODULES.map((module) => (
                    <TableRow key={module.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded bg-muted">
                            <ShieldCheck className="size-3.5 text-primary" />
                          </div>
                          {module.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch 
                          checked={getPermission(selectedDeptId!, module.id, "can_view")}
                          onCheckedChange={(val) => handleToggle(module.id, "can_view", val)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch 
                          checked={getPermission(selectedDeptId!, module.id, "can_create")}
                          onCheckedChange={(val) => handleToggle(module.id, "can_create", val)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch 
                          checked={getPermission(selectedDeptId!, module.id, "can_edit")}
                          onCheckedChange={(val) => handleToggle(module.id, "can_edit", val)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch 
                          checked={getPermission(selectedDeptId!, module.id, "can_delete")}
                          onCheckedChange={(val) => handleToggle(module.id, "can_delete", val)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsEditDialogOpen(false)}>Concluído</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Permissions;
