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
import { Lock, ShieldCheck, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const [selectedDept, setSelectedDept] = useState<string>("");

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: permissions, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ["department-permissions", selectedDept],
    queryFn: async () => {
      if (!selectedDept) return [];
      const { data, error } = await supabase
        .from("department_permissions")
        .select("*")
        .eq("department_id", selectedDept);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDept,
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async (vars: { module: string, field: string, value: boolean }) => {
      const existing = permissions?.find(p => p.module_name === vars.module);
      
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
            department_id: selectedDept,
            module_name: vars.module,
            ...payload
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-permissions", selectedDept] });
      toast.success("Permissão atualizada com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar permissão: " + error.message);
    }
  });

  const handleToggle = (module: string, field: string, value: boolean) => {
    updatePermissionMutation.mutate({ module, field, value });
  };

  const getPermission = (module: string, field: string) => {
    const p = permissions?.find(perm => perm.module_name === module);
    return p ? p[field] : false;
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Lock className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Permissões do Departamento</h1>
          <p className="text-muted-foreground text-sm">Gerencie o que cada departamento pode acessar e realizar</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Selecione um Departamento</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Escolha um departamento..." />
            </SelectTrigger>
            <SelectContent>
              {departments?.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedDept && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Módulo</TableHead>
                  <TableHead className="text-center">Visualizar</TableHead>
                  <TableHead className="text-center">Criar</TableHead>
                  <TableHead className="text-center">Editar</TableHead>
                  <TableHead className="text-center">Excluir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MODULES.map((module) => (
                  <TableRow key={module.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-primary" />
                        {module.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch 
                        checked={getPermission(module.id, "can_view")}
                        onCheckedChange={(val) => handleToggle(module.id, "can_view", val)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch 
                        checked={getPermission(module.id, "can_create")}
                        onCheckedChange={(val) => handleToggle(module.id, "can_create", val)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch 
                        checked={getPermission(module.id, "can_edit")}
                        onCheckedChange={(val) => handleToggle(module.id, "can_edit", val)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch 
                        checked={getPermission(module.id, "can_delete")}
                        onCheckedChange={(val) => handleToggle(module.id, "can_delete", val)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Permissions;
