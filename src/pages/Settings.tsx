import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";
import { Bell, Moon, Sun, Monitor, Shield, Globe, LayoutGrid, FileText, Save, Loader2, Mail, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { useToast } from "@/hooks/use-toast";

 export default function Settings() {
   const { theme, setTheme } = useTheme();
   const { toast } = useToast();
   const [loading, setLoading] = useState(false);
    const [kanbanConfig, setKanbanConfig] = useState<any[]>([]);
    const [reportLayout, setReportLayout] = useState<any>({});
    const [emailSettings, setEmailSettings] = useState({ sender: "" });
    const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
   const [isAdmin, setIsAdmin] = useState(false);
 
   useEffect(() => {
     const loadSettings = async () => {
       const { data: { user } } = await supabase.auth.getUser();
       if (user) {
         const { data: profile } = await supabase.from("profiles").select("regra, is_master").eq("id", user.id).single();
         if (profile && (profile.regra === 'ADMIN' || profile.regra === 'MASTER' || profile.is_master)) {
           setIsAdmin(true);
         }
       }
 
       const { data } = await supabase.from("system_settings").select("*");
        if (data) {
          const kConfig = data.find(s => s.key === 'kanban_config');
          const rLayout = data.find(s => s.key === 'report_layout');
          const eSender = data.find(s => s.key === 'email_sender');
          const eTemplates = data.find(s => s.key === 'email_templates');
          
          if (kConfig) setKanbanConfig(kConfig.value as any[]);
          if (rLayout) setReportLayout(rLayout.value as any);
          if (eSender) setEmailSettings({ sender: eSender.value as string });
          if (eTemplates) setEmailTemplates(eTemplates.value as any[]);
        }
     };
     loadSettings();
   }, []);
 
    const saveSettings = async () => {
      setLoading(true);
      try {
        const settings = [
          { key: 'kanban_config', value: kanbanConfig },
          { key: 'report_layout', value: reportLayout },
          { key: 'email_sender', value: emailSettings.sender },
          { key: 'email_templates', value: emailTemplates }
        ];

        for (const setting of settings) {
          const { error } = await supabase.from("system_settings").upsert({
            key: setting.key,
            value: setting.value,
            updated_at: new Date().toISOString()
          });
          if (error) throw error;
        }
  
        toast({ title: "Sucesso", description: "Configurações salvas com sucesso!" });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
      } finally {
        setLoading(false);
      }
    };

   return (
     <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 animate-fade-in">
       <div className="flex justify-between items-center">
         <div>
           <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
           <p className="text-muted-foreground">Ajuste as preferências do sistema e sua experiência.</p>
         </div>
         {isAdmin && (
           <Button onClick={saveSettings} disabled={loading} className="gap-2">
             {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={18} />}
             Salvar Alterações
           </Button>
         )}
       </div>
 
       <Tabs defaultValue="geral" className="w-full">
         <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-5 mb-8">
           <TabsTrigger value="geral">Geral</TabsTrigger>
           <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
           {isAdmin && (
             <>
               <TabsTrigger value="email">E-mail & Alertas</TabsTrigger>
               <TabsTrigger value="kanban">Kanban</TabsTrigger>
               <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
             </>
           )}
         </TabsList>

         <TabsContent value="geral" className="space-y-6">
           <Card>
             <CardHeader>
               <div className="flex items-center gap-2">
                 <Monitor className="h-5 w-5 text-primary" />
                 <CardTitle>Aparência</CardTitle>
               </div>
             </CardHeader>
             <CardContent className="space-y-6">
               <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                   <Label>Tema do Sistema</Label>
                   <p className="text-sm text-muted-foreground">Escolha entre o modo claro, escuro ou automático.</p>
                 </div>
                 <div className="flex bg-muted p-1 rounded-lg gap-1">
                   {/* Theme buttons */}
                   <button onClick={() => setTheme("light")} className={`p-2 rounded-md transition-all ${theme === "light" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}><Sun size={18} /></button>
                   <button onClick={() => setTheme("dark")} className={`p-2 rounded-md transition-all ${theme === "dark" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}><Moon size={18} /></button>
                   <button onClick={() => setTheme("system")} className={`p-2 rounded-md transition-all ${theme === "system" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}><Monitor size={18} /></button>
                 </div>
               </div>
             </CardContent>
           </Card>
           <Card>
             <CardHeader>
               <div className="flex items-center gap-2">
                 <Shield className="h-5 w-5 text-primary" />
                 <CardTitle>Segurança</CardTitle>
               </div>
             </CardHeader>
             <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Autenticação de Dois Fatores</Label>
                    <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança.</p>
                  </div>
                  <Switch />
                </div>
             </CardContent>
           </Card>
         </TabsContent>

         <TabsContent value="notificacoes" className="space-y-6">
           <Card>
             <CardHeader>
               <div className="flex items-center gap-2">
                 <Bell className="h-5 w-5 text-primary" />
                 <CardTitle>Preferências de Notificação</CardTitle>
               </div>
             </CardHeader>
             <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label>Notificações por E-mail</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between border-t pt-6">
                  <Label>Alertas de SLA</Label>
                  <Switch defaultChecked />
                </div>
             </CardContent>
           </Card>
         </TabsContent>

         {isAdmin && (
           <>
             <TabsContent value="email" className="space-y-6">
               <Card>
                 <CardHeader>
                   <div className="flex items-center gap-2">
                     <Mail className="h-5 w-5 text-primary" />
                     <CardTitle>Configuração de Disparo</CardTitle>
                   </div>
                   <CardDescription>Configure o e-mail de alerta e os textos padrões.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>E-mail do Remetente</Label>
                      <Input 
                        placeholder="ex: alerta@empresa.com" 
                        value={emailSettings.sender}
                        onChange={e => setEmailSettings({ ...emailSettings, sender: e.target.value })}
                      />
                    </div>
                    <div className="border-t pt-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-lg font-bold">Modelos de E-mail (Templates)</Label>
                        <Button variant="outline" size="sm" onClick={() => setEmailTemplates([...emailTemplates, { id: Math.random().toString(), name: "Novo Modelo", subject: "", body: "" }])}>
                          <Plus size={14} className="mr-1" /> Adicionar
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mb-4">
                        Tags disponíveis: <code className="bg-muted px-1 rounded">{"{os}"}</code>, <code className="bg-muted px-1 rounded">{"{user}"}</code>, <code className="bg-muted px-1 rounded">{"{titulo}"}</code>, <code className="bg-muted px-1 rounded">{"{status}"}</code>, <code className="bg-muted px-1 rounded">{"{descricao}"}</code>
                      </div>
                      
                      {emailTemplates.map((template, idx) => (
                        <div key={template.id} className="p-4 border rounded-md space-y-4 relative">
                          <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => setEmailTemplates(emailTemplates.filter((_, i) => i !== idx))}>
                            <Trash2 size={14} />
                          </Button>
                          <div className="space-y-2">
                            <Label>Nome da Situação</Label>
                            <Input 
                              value={template.name} 
                              onChange={e => {
                                const nt = [...emailTemplates];
                                nt[idx].name = e.target.value;
                                setEmailTemplates(nt);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Assunto do E-mail</Label>
                            <Input 
                              value={template.subject} 
                              onChange={e => {
                                const nt = [...emailTemplates];
                                nt[idx].subject = e.target.value;
                                setEmailTemplates(nt);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Corpo do Texto</Label>
                            <textarea 
                              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              value={template.body} 
                              onChange={e => {
                                const nt = [...emailTemplates];
                                nt[idx].body = e.target.value;
                                setEmailTemplates(nt);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                 </CardContent>
               </Card>
             </TabsContent>

             <TabsContent value="kanban" className="space-y-6">
               <Card>
                 <CardHeader>
                   <div className="flex items-center gap-2">
                     <LayoutGrid className="h-5 w-5 text-primary" />
                     <CardTitle>Colunas do Kanban</CardTitle>
                   </div>
                 </CardHeader>
                 <CardContent className="space-y-6">
                    {kanbanConfig.map((col, idx) => (
                      <div key={col.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-4 last:border-0 last:pb-0">
                        <div className="space-y-2">
                          <Label>Nome</Label>
                          <Input value={col.title} onChange={e => { const nc = [...kanbanConfig]; nc[idx].title = e.target.value; setKanbanConfig(nc); }} />
                        </div>
                        <div className="space-y-2">
                          <Label>Cor (CSS)</Label>
                          <Input value={col.color} onChange={e => { const nc = [...kanbanConfig]; nc[idx].color = e.target.value; setKanbanConfig(nc); }} />
                        </div>
                        <div className="flex items-end gap-2 pb-1">
                          <Button variant="outline" size="sm" disabled={idx === 0} onClick={() => { const nc = [...kanbanConfig]; [nc[idx-1], nc[idx]] = [nc[idx], nc[idx-1]]; setKanbanConfig(nc); }}>↑</Button>
                          <Button variant="outline" size="sm" disabled={idx === kanbanConfig.length - 1} onClick={() => { const nc = [...kanbanConfig]; [nc[idx+1], nc[idx]] = [nc[idx], nc[idx+1]]; setKanbanConfig(nc); }}>↓</Button>
                        </div>
                      </div>
                    ))}
                 </CardContent>
               </Card>
             </TabsContent>

             <TabsContent value="relatorios" className="space-y-6">
               <Card>
                 <CardHeader>
                   <div className="flex items-center gap-2">
                     <FileText className="h-5 w-5 text-primary" />
                     <CardTitle>Layout PDF</CardTitle>
                   </div>
                 </CardHeader>
                 <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Label>Mostrar Logo</Label>
                      <Switch checked={reportLayout.showLogo} onCheckedChange={v => setReportLayout({ ...reportLayout, showLogo: v })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cor do Cabeçalho</Label>
                      <Input type="color" value={reportLayout.headerColor || "#000000"} onChange={e => setReportLayout({ ...reportLayout, headerColor: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Texto do Rodapé</Label>
                      <Input value={reportLayout.footerText || ""} onChange={e => setReportLayout({ ...reportLayout, footerText: e.target.value })} />
                    </div>
                 </CardContent>
               </Card>
             </TabsContent>
           </>
         )}
       </Tabs>
     </div>
   );
}
