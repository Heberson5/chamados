import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Briefcase, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminStructure = () => {
  const [depts, setDepts] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: d } = await supabase.from("departments").select("*, organizations(name)").order("name");
    const { data: p } = await supabase.from("positions").select("*, organizations(name)").order("name");
    setDepts(d || []);
    setPositions(p || []);
    setLoading(false);
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
              <Button size="sm" className="gap-2"><Plus className="size-4" /> Novo Depto</Button>
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
              <Button size="sm" className="gap-2"><Plus className="size-4" /> Novo Cargo</Button>
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
