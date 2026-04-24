import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Building2, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Org = { id: string; name: string; slug: string; created_at: string };

const AdminCompanies = () => {
  const [companies, setCompanies] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase.from("organizations").select("*").order("name");
    setCompanies(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Gestão de Empresas" 
        description="Visualize e gerencie todas as empresas cadastradas no sistema."
        actions={
          <Button size="sm" className="gap-2">
            <Plus className="size-4" /> Nova Empresa
          </Button>
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
              <div className="text-xs text-muted-foreground mb-4">Slug: {company.slug}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="w-full gap-1">
                  <Pencil className="size-3" /> Editar
                </Button>
                <Button variant="outline" size="sm" className="w-full gap-1 text-destructive hover:text-destructive">
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
