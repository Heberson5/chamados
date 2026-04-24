import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, User, Building2, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*, organizations(name), departments(name), positions(name)")
      .order("full_name");
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Usuários" 
        description="Gerencie usuários de todas as empresas e seus acessos."
        actions={
          <Button size="sm" className="gap-2">
            <UserPlus className="size-4" /> Novo Usuário
          </Button>
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
