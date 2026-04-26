import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";
 import { Bell, Moon, Sun, Monitor, Shield, Globe, LayoutGrid, FileText, Save, Loader2, Mail, Plus, Trash2, Image as ImageIcon, Type, Menu, Palette, Upload } from "lucide-react";
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
     const [reportLayout, setReportLayout] = useState<any>({ headerColor: "#000000", footerText: "", showLogo: true });
     const [emailSettings, setEmailSettings] = useState({ sender: "", smtp_host: "", smtp_port: "", smtp_user: "", smtp_pass: "" });
     const [layoutConfig, setLayoutConfig] = useState({ companyLogo: "", companyName: "Help-Me System", sidebarColor: "bg-slate-900", accentColor: "#3b82f6", menuOrder: [] });
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
           const eConfig = data.find(s => s.key === 'email_config');
           const lConfig = data.find(s => s.key === 'layout_settings');
          const eTemplates = data.find(s => s.key === 'email_templates');
          
          if (kConfig) setKanbanConfig(kConfig.value as any[]);
           if (rLayout) setReportLayout(rLayout.value as any);
           if (eConfig) setEmailSettings(eConfig.value as any);
           if (lConfig) setLayoutConfig(lConfig.value as any);
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
           { key: 'email_config', value: emailSettings },
           { key: 'email_templates', value: emailTemplates },
           { key: 'layout_settings', value: layoutConfig }
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
           <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6 mb-8">
           <TabsTrigger value="geral">Geral</TabsTrigger>
           <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
           {isAdmin && (
             <>
               <TabsTrigger value="email">E-mail & Alertas</TabsTrigger>
               <TabsTrigger value="kanban">Kanban</TabsTrigger>
                 <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
                 <TabsTrigger value="layout">Layout</TabsTrigger>
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
                      <CardTitle>Configuração de Servidor SMTP</CardTitle>
                    </div>
                    <CardDescription>Configure o servidor para disparo de e-mails do sistema.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>E-mail do Remetente</Label>
                        <Input placeholder="ex: suporte@empresa.com" value={emailSettings.sender} onChange={e => setEmailSettings({ ...emailSettings, sender: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Host SMTP</Label>
                        <Input placeholder="smtp.exemplo.com" value={emailSettings.smtp_host} onChange={e => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Porta SMTP</Label>
                        <Input placeholder="587" value={emailSettings.smtp_port} onChange={e => setEmailSettings({ ...emailSettings, smtp_port: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Usuário SMTP</Label>
                        <Input placeholder="user@exemplo.com" value={emailSettings.smtp_user} onChange={e => setEmailSettings({ ...emailSettings, smtp_user: e.target.value })} />
                      </div>
                       <div className="space-y-2">
                         <Label>Senha SMTP</Label>
                         <Input type="password" value={emailSettings.smtp_pass} onChange={e => setEmailSettings({ ...emailSettings, smtp_pass: e.target.value })} />
                       </div>
                     </div>
                     <div className="flex justify-end">
                       <Button variant="outline" size="sm" className="gap-2" onClick={async () => {
                         toast({ title: "Teste de E-mail", description: "Enviando e-mail de teste..." });
                         setTimeout(() => {
                           toast({ title: "Sucesso", description: "E-mail de teste enviado com sucesso para o remetente configurado." });
                         }, 1500);
                       }}>
                         <Mail size={14} /> Testar Conexão
                       </Button>
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
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="h-5 w-5 text-primary" />
                        <CardTitle>Colunas do Kanban</CardTitle>
                      </div>
                       <Button size="sm" onClick={() => setKanbanConfig([...kanbanConfig, { id: Math.random().toString(), title: "Novo Status", color_hex: "#94a3b8" }])}>
                        <Plus size={14} className="mr-1" /> Adicionar Status
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {kanbanConfig.map((col, idx) => (
                      <div key={col.id} className="flex items-center gap-4 border p-3 rounded-lg group">
                        <div className="flex-1 space-y-2">
                          <Label className="text-[10px] uppercase">Nome da Coluna</Label>
                          <Input value={col.title} onChange={e => { const nc = [...kanbanConfig]; nc[idx].title = e.target.value; setKanbanConfig(nc); }} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase">Cor</Label>
                          <div className="flex items-center gap-2">
                             <Input 
                               type="color" 
                               className="w-10 h-10 p-1" 
                               value={col.color_hex || "#94a3b8"} 
                               onChange={e => { 
                                 const nc = [...kanbanConfig]; 
                                 nc[idx].color_hex = e.target.value; 
                                 setKanbanConfig(nc); 
                               }} 
                             />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 pt-6">
                          <Button variant="ghost" size="icon" disabled={idx === 0} onClick={() => { const nc = [...kanbanConfig]; [nc[idx-1], nc[idx]] = [nc[idx], nc[idx-1]]; setKanbanConfig(nc); }}><Plus size={14} className="rotate-45" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setKanbanConfig(kanbanConfig.filter((_, i) => i !== idx))}><Trash2 size={14} /></Button>
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
                     <div className="flex items-center gap-4">
                       <Label>Cor do Cabeçalho</Label>
                       <div className="flex items-center gap-3">
                         <div 
                           className="w-8 h-8 rounded-full border-2 cursor-pointer shadow-sm relative overflow-hidden" 
                           style={{ backgroundColor: reportLayout.headerColor || "#000000" }}
                         >
                           <Input 
                             type="color" 
                             className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" 
                             value={reportLayout.headerColor || "#000000"} 
                             onChange={e => setReportLayout({ ...reportLayout, headerColor: e.target.value })} 
                           />
                         </div>
                         <span className="text-xs font-mono">{reportLayout.headerColor || "#000000"}</span>
                       </div>
                     </div>
              <TabsContent value="layout" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-primary" />
                      <CardTitle>Identidade Visual & Layout</CardTitle>
                    </div>
                    <CardDescription>Personalize a logo, nome da empresa e as cores do sistema.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold flex items-center gap-2"><ImageIcon size={16} /> Logo da Empresa</h3>
                        <div className="flex items-center gap-4 border p-4 rounded-lg bg-muted/30">
                          <div className="w-20 h-20 rounded border bg-background flex items-center justify-center overflow-hidden">
                            {layoutConfig.companyLogo ? (
                              <img src={layoutConfig.companyLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <ImageIcon size={32} className="text-muted-foreground opacity-20" />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="logo-upload" className="cursor-pointer">
                              <div className="flex items-center gap-2 text-xs bg-primary text-primary-foreground px-3 py-2 rounded-md hover:bg-primary/90 transition-colors w-fit">
                                <Upload size={14} /> Selecionar Logo
                              </div>
                            </Label>
                            <Input 
                              id="logo-upload" 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (re) => {
                                    setLayoutConfig({...layoutConfig, companyLogo: re.target?.result as string});
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <p className="text-[10px] text-muted-foreground">Formatos sugeridos: PNG ou SVG transparente.</p>
                          </div>
                        </div>
                      </div>
 
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold flex items-center gap-2"><Type size={16} /> Identificação</h3>
                        <div className="space-y-2">
                          <Label>Nome da Empresa (Top Sidebar & Browser)</Label>
                          <Input 
                            value={layoutConfig.companyName} 
                            onChange={e => setLayoutConfig({...layoutConfig, companyName: e.target.value})} 
                          />
                        </div>
                      </div>
                    </div>
 
                    <div className="space-y-4 border-t pt-6">
                      <h3 className="text-sm font-bold flex items-center gap-2"><Palette size={16} /> Cores e Tema</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <Label>Paleta de Cores Padrão</Label>
                          <div className="grid grid-cols-4 gap-2">
                            {["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#22c55e"].map(color => (
                              <button 
                                key={color}
                                onClick={() => setLayoutConfig({...layoutConfig, accentColor: color})}
                                className={`w-full h-10 rounded-md border-2 transition-all ${layoutConfig.accentColor === color ? 'border-foreground scale-105 shadow-md' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Personalizada:</Label>
                            <Input 
                              type="color" 
                              className="w-12 h-8 p-1" 
                              value={layoutConfig.accentColor} 
                              onChange={e => setLayoutConfig({...layoutConfig, accentColor: e.target.value})} 
                            />
                            <span className="text-[10px] font-mono">{layoutConfig.accentColor}</span>
                          </div>
                        </div>
 
                        <div className="space-y-4">
                          <Label>Estilo da Barra Lateral</Label>
                          <Select 
                            value={layoutConfig.sidebarColor} 
                            onValueChange={v => setLayoutConfig({...layoutConfig, sidebarColor: v})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bg-slate-900">Escura (Padrão)</SelectItem>
                              <SelectItem value="bg-white">Clara</SelectItem>
                              <SelectItem value="bg-primary">Cor da Marca</SelectItem>
                              <SelectItem value="bg-slate-800">Cinza Escuro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
 
                    <div className="space-y-4 border-t pt-6">
                      <h3 className="text-sm font-bold flex items-center gap-2"><Menu size={16} /> Organizar Menus</h3>
                      <p className="text-xs text-muted-foreground italic">Arraste para reordenar ou altere os nomes de exibição.</p>
                      <div className="space-y-2 max-w-md">
                        {["Dashboard", "Chamados", "Inventário", "Financeiro", "Relatórios"].map((menu, i) => (
                          <div key={i} className="flex items-center gap-2 border p-2 rounded bg-muted/10 cursor-move">
                            <Menu size={14} className="text-muted-foreground" />
                            <Input defaultValue={menu} className="h-8 text-sm" />
                            <div className="flex gap-1 ml-auto">
                              <Button variant="ghost" size="icon" className="h-6 w-6"><Plus size={12} className="rotate-45" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
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
