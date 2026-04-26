import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Building, User } from "lucide-react";

const Settings = () => {
  const { org, profile, refresh } = useAuth();
  const [emailConfig, setEmailConfig] = useState(org?.email_settings || {
    sender_email: "notificacoes@suaempresa.com",
    sender_name: "Sistema de Chamados"
  });
  const [saving, setSaving] = useState(false);

  const canManageEmail = profile?.is_master || profile?.role === 'admin';

  const saveEmailSettings = async () => {
    if (!org?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({ email_settings: emailConfig })
      .eq("id", org.id);
    
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Configurações de e-mail salvas!");
      refresh();
    }
  };

  return (
    <>
      <PageHeader title="Configurações" />
      <div className="p-6 max-w-4xl">
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList>
            <TabsTrigger value="account" className="gap-2"><User className="size-4" /> Conta</TabsTrigger>
            <TabsTrigger value="company" className="gap-2"><Building className="size-4" /> Empresa</TabsTrigger>
            {canManageEmail && (
              <TabsTrigger value="email" className="gap-2"><Mail className="size-4" /> E-mail</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Sua Conta</CardTitle>
                <CardDescription>Gerencie suas informações pessoais.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Nome</Label>
                  <Input value={profile?.full_name ?? ""} disabled />
                </div>
                <div className="grid gap-2">
                  <Label>E-mail</Label>
                  <Input value={profile?.email ?? ""} disabled />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Dados da Empresa</CardTitle>
                <CardDescription>Informações da sua organização.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Nome</Label>
                  <Input value={org?.name ?? ""} disabled />
                </div>
                <div className="grid gap-2">
                  <Label>Identificador (Slug)</Label>
                  <Input value={org?.slug ?? ""} disabled className="font-mono text-xs" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {canManageEmail && (
            <TabsContent value="email">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Notificação</CardTitle>
                  <CardDescription>Configure o e-mail que enviará as notificações de chamados.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sender_email">E-mail do Remetente</Label>
                    <Input 
                      id="sender_email" 
                      placeholder="ex: suporte@empresa.com" 
                      value={emailConfig.sender_email}
                      onChange={(e) => setEmailConfig({ ...emailConfig, sender_email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sender_name">Nome do Remetente</Label>
                    <Input 
                      id="sender_name" 
                      placeholder="ex: Suporte Empresa" 
                      value={emailConfig.sender_name}
                      onChange={(e) => setEmailConfig({ ...emailConfig, sender_name: e.target.value })}
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-6">
                  <Button onClick={saveEmailSettings} disabled={saving}>
                    {saving ? "Salvando..." : "Salvar Configurações"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <div className="mt-8">
          <p className="text-xs text-muted-foreground">
            Mais opções (SLA, automações, integrações) virão nas próximas iterações.
          </p>
        </div>
      </div>
    </>
  );
};

export default Settings;