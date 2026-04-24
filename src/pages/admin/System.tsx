import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useToast } from "@/hooks/use-toast";
import { Save, Image as ImageIcon } from "lucide-react";

const AdminSystem = () => {
  const { data: settings, refetch } = useSystemSettings();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    system_name: "",
    logo_url: "",
    favicon_url: "",
    primary_color: "#3b82f6",
    menu_config: [] as any[],
    landing_page_config: {} as any,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        system_name: settings.system_name || "",
        logo_url: settings.logo_url || "",
        favicon_url: settings.favicon_url || "",
        primary_color: settings.primary_color || "#3b82f6",
        menu_config: settings.menu_config || [],
        landing_page_config: settings.landing_page_config || {},
      });
    }
  }, [settings]);

  const onSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("system_settings")
      .update(form)
      .eq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
    } else {
      toast({ title: "Configurações salvas", description: "O sistema foi atualizado." });
      refetch();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Configurações do Sistema" 
        description="Personalize o nome, logo e menus do sistema global."
        actions={
          <Button onClick={onSave} disabled={loading} className="gap-2">
            <Save className="size-4" /> Salvar Alterações
          </Button>
        }
      />
      
      <div className="p-6 grid gap-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Identidade Visual</CardTitle>
            <CardDescription>Configure como o sistema aparece para os usuários.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system_name">Nome do Sistema</Label>
              <Input 
                id="system_name" 
                value={form.system_name} 
                onChange={(e) => setForm({ ...form, system_name: e.target.value })}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logo_url">URL do Logo</Label>
                <div className="flex gap-2">
                  <Input 
                    id="logo_url" 
                    placeholder="https://..." 
                    value={form.logo_url} 
                    onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                  />
                  {form.logo_url && (
                    <div className="size-10 rounded border grid place-items-center bg-muted">
                      <img src={form.logo_url} className="size-6 object-contain" alt="Preview" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="favicon_url">URL do Favicon</Label>
                <div className="flex gap-2">
                  <Input 
                    id="favicon_url" 
                    placeholder="https://..." 
                    value={form.favicon_url} 
                    onChange={(e) => setForm({ ...form, favicon_url: e.target.value })}
                  />
                  {form.favicon_url && (
                    <div className="size-10 rounded border grid place-items-center bg-muted">
                      <img src={form.favicon_url} className="size-6 object-contain" alt="Preview" />
                    </div>
                  )}
                 </div>
               </div>
             </div>
             <div className="space-y-2">
               <Label htmlFor="primary_color">Cor Primária do Sistema</Label>
               <div className="flex gap-3 items-center">
                 <Input 
                   id="primary_color" 
                   type="color"
                   className="w-12 h-10 p-1"
                   value={form.primary_color} 
                   onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                 />
                 <Input 
                   value={form.primary_color} 
                   onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                   className="max-w-[120px]"
                 />
               </div>
             </div>
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Arquitetura de Menus</CardTitle>
          <CardDescription>Altere os nomes de exibição dos itens de menu principais.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {["Dashboard", "Chamados", "Kanban", "Empresas", "Usuários", "Estrutura", "Sistema", "Configurações"].map((key) => {
              const item = (form.menu_config || []).find((m: any) => m.key === key) || { key, label: key };
              return (
                <div key={key} className="grid grid-cols-2 gap-4 items-center border-b pb-2 last:border-0">
                  <Label className="text-xs font-mono text-muted-foreground">{key}</Label>
                  <Input 
                    placeholder={`Nome para ${key}`}
                    value={item.label}
                    onChange={(e) => {
                      const newMenu = [...(form.menu_config || [])];
                      const idx = newMenu.findIndex(m => m.key === key);
                      if (idx >= 0) {
                        newMenu[idx] = { ...newMenu[idx], label: e.target.value };
                      } else {
                        newMenu.push({ key, label: e.target.value });
                      }
                      setForm({ ...form, menu_config: newMenu });
                    }}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Página de Divulgação (Landing Page)</CardTitle>
          <CardDescription>Configure os textos e imagens da página inicial.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero_title">Título Principal (Hero)</Label>
            <Input 
              id="hero_title" 
              placeholder="Título de impacto"
              value={form.landing_page_config?.hero_title || ""} 
              onChange={(e) => setForm({ 
                ...form, 
                landing_page_config: { ...form.landing_page_config, hero_title: e.target.value } 
              })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero_subtitle">Subtítulo</Label>
            <Input 
              id="hero_subtitle" 
              placeholder="Descrição curta do serviço"
              value={form.landing_page_config?.hero_subtitle || ""} 
              onChange={(e) => setForm({ 
                ...form, 
                landing_page_config: { ...form.landing_page_config, hero_subtitle: e.target.value } 
              })}
            />
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default AdminSystem;
