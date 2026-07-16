import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";
 import { Bell, Moon, Sun, Monitor, Shield, Globe, LayoutGrid, FileText, Save, Loader2, Mail, Plus, Trash2, Image as ImageIcon, Type, Menu, Palette, Upload, ChevronUp, ChevronDown, Sparkles, MessageSquareText, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { useState, useEffect } from "react";
 import { useNavigate } from "react-router-dom";
 import { usePermissions } from "@/hooks/usePermissions";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { useToast } from "@/hooks/use-toast";
import LandingLiveEditor from "@/components/LandingLiveEditor";

  export default function Settings() {
    const navigate = useNavigate();
    const { hasPermission, loading: permsLoading } = usePermissions();

    useEffect(() => {
      if (!permsLoading && !hasPermission("configuracoes")) {
        navigate("/dashboard");
      }
    }, [permsLoading, hasPermission, navigate]);

   const { theme, setTheme } = useTheme();
   const { toast } = useToast();
   const [loading, setLoading] = useState(false);
   const [isInitialLoading, setIsInitialLoading] = useState(true);
    // Preenchido a partir de chamado_statuses em loadSettings (mesma fonte
    // de dados que o board real usa) — fica vazio até lá.
    const [kanbanConfig, setKanbanConfig] = useState<any[]>([]);
      const [reportLayout, setReportLayout] = useState<any>({
         headerText: "Relatório de Chamados",
         headerColor: "#000000",
         headerTextColor: "#ffffff",
         footerText: "",
        showLogo: true,
        logoAlignment: "left",
        logoWidth: 18,
        logoHeight: 18,
        columns: [
          { id: 'os', label: 'OS', visible: true, field: 'os' },
          { id: 'titulo', label: 'Título', visible: true, field: 'titulo' },
          { id: 'status', label: 'Status', visible: true, field: 'status' },
          { id: 'prioridade', label: 'Prioridade', visible: true, field: 'prioridade' },
          { id: 'gerado_em', label: 'Data de Abertura', visible: true, field: 'gerado_em' },
          { id: 'tecnico', label: 'Técnico', visible: true, field: 'tecnico' },
        ]
      });
     const [sessionTimeout, setSessionTimeout] = useState("300");
     const [emailSettings, setEmailSettings] = useState({ sender: "", smtp_host: "", smtp_port: "", smtp_user: "", smtp_pass: "" });
     const [smsConfig, setSmsConfig] = useState({ provider: "mobizon", api_key: "", sender_id: "", ddi: "55" });
     const [accessWarnings, setAccessWarnings] = useState({ pre_minutes: 30, final_minutes: 5, browser_notify: true });
    const defaultMenuOrder = [
      { id: '1', label: "Painel", path: "/dashboard", visible: true },
      { id: '2', label: "Chamados", path: "/chamados", visible: true },
      { id: '11', label: "Acompanhamento", path: "/acompanhamento", visible: true },
      { id: '6', label: "Relatórios", path: "/reports", visible: true },
      { id: '3', label: "Usuários", path: "/usuarios", visible: true },
       { id: '4', label: "Permissões", path: "/permissions", visible: true },
       { id: '9', label: "Departamentos", path: "/departamentos", visible: true },
       { id: '5', label: "Auditoria", path: "/audit", visible: true },
       { id: '10', label: "Ajuda", path: "/ajuda", visible: true },
       { id: '8', label: "Configurações", path: "/settings", visible: true },
    ];

     const [layoutConfig, setLayoutConfig] = useState({ 
       companyLogo: "", 
       companyFavicon: "",
       companyName: "Chamados", 
       sidebarColor: "bg-slate-900", 
       accentColor: "#3b82f6", 
       menuOrder: defaultMenuOrder
     });
      const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
      const [emailLayout, setEmailLayout] = useState("");
      const [priorities, setPriorities] = useState<any[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isMaster, setIsMaster] = useState(false);
    const defaultLandingConfig = {
      bgColor: "#020617",
      accentColor: "",
      brandTitle: "GESTÃO QUE",
      brandHighlight: "TRANSFORMA.",
      subtitle: "A plataforma definitiva para controle de atendimento, inventário e produtividade da sua operação.",
      features: [
        { id: "1", text: "SLA Inteligente & Automático" },
        { id: "2", text: "Inventário em Tempo Real" },
        { id: "3", text: "Workflows Customizáveis" },
        { id: "4", text: "Analytics Avançado" },
      ],
      formTitle: "Acesso",
      formSubtitle: "Bem-vindo. Por favor, identifique-se.",
      statusText: "Sistema Online",
    };
    const [landingConfig, setLandingConfig] = useState<any>(defaultLandingConfig);
 
     useEffect(() => {
       const loadSettings = async () => {
        try {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) return;

         const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
         if (profile) {
           if (profile.regra === 'ADMIN' || profile.regra === 'MASTER' || profile.is_master) {
             setIsAdmin(true);
           }
            if (profile.regra === 'MASTER' || profile.is_master) {
              setIsMaster(true);
            }
         }

         // As colunas do Kanban vêm de chamado_statuses — é a mesma tabela que
         // ChamadosKanban.tsx usa para montar o board de verdade.
         const { data: statuses } = await supabase
           .from("chamado_statuses")
           .select("*")
           .eq("ativo", true)
           .order("ordem", { ascending: true });
         if (statuses) setKanbanConfig(statuses);

         const { data } = await supabase.from("system_settings").select("*");
          if (data) {
             const rLayout = data.find(s => s.key === 'report_layout');
             const eConfig = data.find(s => s.key === 'email_config');
             const smsConfigData = data.find(s => s.key === 'sms_config');
              const lConfig = data.find(s => s.key === 'layout_settings');
              const sTimeout = data.find(s => s.key === 'session_timeout');
               const eTemplates = data.find(s => s.key === 'email_templates');
               const eLayout = data.find(s => s.key === 'email_layout');
               const landing = data.find(s => s.key === 'landing_page_settings');
               if (landing) {
                 setLandingConfig({ ...defaultLandingConfig, ...(landing.value as any) });
               }
             
             // Fetch priorities
             const { data: prioData } = await supabase.from("chamados_prioridades").select("*").order("ordem");
             if (prioData) setPriorities(prioData);
 
             if (rLayout) {
               const val = rLayout.value as any;
               if (!val.columns) {
                 val.columns = [
                   { id: 'os', label: 'OS', visible: true, field: 'os' },
                   { id: 'titulo', label: 'Título', visible: true, field: 'titulo' },
                   { id: 'status', label: 'Status', visible: true, field: 'status' },
                   { id: 'prioridade', label: 'Prioridade', visible: true, field: 'prioridade' },
                   { id: 'gerado_em', label: 'Data de Abertura', visible: true, field: 'gerado_em' },
                   { id: 'tecnico', label: 'Técnico', visible: true, field: 'tecnico' },
                 ];
               }
                 setReportLayout({
                   logoWidth: 18,
                   logoHeight: 18,
                   headerTextColor: "#ffffff",
                   headerText: "Relatório de Chamados",
                   ...val
                 });
             }
             if (eConfig) setEmailSettings(eConfig.value as any);
             if (smsConfigData) setSmsConfig({ provider: "mobizon", api_key: "", sender_id: "", ddi: "55", ...(smsConfigData.value as any) });
             if (lConfig) {
               const val = lConfig.value as any;
               let currentOrder = val.menuOrder || [];
               
               // Ensure all default items are present
               defaultMenuOrder.forEach(defaultItem => {
                 if (!currentOrder.some((item: any) => item.id === defaultItem.id)) {
                   currentOrder.push(defaultItem);
                 }
               });
               
               val.menuOrder = currentOrder;
               setLayoutConfig(val);
             }
            if (sTimeout) setSessionTimeout(sTimeout.value as string);
             if (eTemplates) setEmailTemplates(eTemplates.value as any[]);
             if (eLayout) setEmailLayout(eLayout.value as string);
              const aWarn = data.find(s => s.key === 'access_warnings');
              if (aWarn?.value) setAccessWarnings({ ...accessWarnings, ...(aWarn.value as any) });
          }
        } finally {
          setIsInitialLoading(false);
        }
       };
       loadSettings();
     }, []);
 
      const saveSettings = async () => {
        setLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // As colunas do Kanban são gravadas direto em chamado_statuses —
          // a mesma tabela que o board real (ChamadosKanban.tsx) usa. Só
          // Master pode gravar (regra de segurança do banco).
          if (isMaster) {
            let ordem = 0;
            for (const col of kanbanConfig) {
              ordem++;
              const payload: any = {
                label: col.label,
                cor: col.cor || "#94a3b8",
                ordem,
                is_inicial: !!col.is_inicial,
                is_pausa: !!col.is_pausa,
                is_encerrado: !!col.is_encerrado,
                is_cancelado: !!col.is_cancelado,
                ativo: true,
              };
              if (col.id) {
                const { error } = await supabase.from("chamado_statuses").update(payload).eq("id", col.id);
                if (error) throw error;
              } else {
                payload.key = `${(col.label || "status").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}_${Date.now()}`;
                const { error } = await supabase.from("chamado_statuses").insert(payload);
                if (error) throw error;
              }
            }
            const keptIds = kanbanConfig.filter((c: any) => c.id).map((c: any) => c.id);
            const { data: existingStatuses } = await supabase.from("chamado_statuses").select("id").eq("ativo", true);
            const toDeactivate = (existingStatuses || []).filter((e: any) => !keptIds.includes(e.id)).map((e: any) => e.id);
            if (toDeactivate.length > 0) {
              const { error } = await supabase.from("chamado_statuses").update({ ativo: false }).in("id", toDeactivate);
              if (error) throw error;
            }
            const { data: refreshed } = await supabase
              .from("chamado_statuses")
              .select("*")
              .eq("ativo", true)
              .order("ordem", { ascending: true });
            if (refreshed) setKanbanConfig(refreshed);
          }

          if (isAdmin) {
            const settings = [
               { key: 'report_layout', value: reportLayout },
               { key: 'email_config', value: emailSettings },
               { key: 'sms_config', value: smsConfig },
                 { key: 'email_templates', value: emailTemplates },
                 { key: 'email_layout', value: emailLayout },
                { key: 'layout_settings', value: layoutConfig },
                { key: 'session_timeout', value: sessionTimeout },
                { key: 'access_warnings', value: accessWarnings }
            ];

            if (isMaster) {
              settings.push({ key: 'landing_page_settings', value: landingConfig });
            }
  
            for (const setting of settings) {
              const { error } = await supabase.from("system_settings").upsert({
                key: setting.key,
                value: setting.value,
                updated_at: new Date().toISOString()
              });
              if (error) throw error;
            }
             // Notify BrandingProvider immediately for instant in-tab updates
             window.dispatchEvent(new CustomEvent("branding:updated", { detail: layoutConfig }));
 
             // Save Priorities
             for (const prio of priorities) {
               if (prio.id) {
                 await supabase.from("chamados_prioridades").update({
                   nome: prio.nome,
                   cor: prio.cor,
                   ordem: prio.ordem
                 }).eq("id", prio.id);
               } else {
                 // Create new priority if needed
                 const { data: user } = await supabase.auth.getUser();
                 const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.user?.id).single();
                 await supabase.from("chamados_prioridades").insert({
                   nome: prio.nome,
                   cor: prio.cor,
                   ordem: prio.ordem,
                   organization_id: profile?.organization_id
                 });
               }
             }
           }
     
           toast({ title: "Sucesso", description: "Configurações salvas com sucesso!" });
        } catch (error: any) {
          toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
        } finally {
          setLoading(false);
        }
      };

   if (isInitialLoading) {
     return (
       <div className="flex h-full min-h-[60vh] w-full items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }

   return (
     <div className="p-4 md:p-8 w-full space-y-8 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
            <p className="text-muted-foreground">Ajuste as preferências do sistema e sua experiência.</p>
          </div>
          <Button onClick={saveSettings} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={18} />}
            Salvar Alterações
          </Button>
        </div>
 
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1 mb-8 p-1">
            <TabsTrigger value="geral" className="flex-1 min-w-[110px]">Geral</TabsTrigger>
            <TabsTrigger value="notificacoes" className="flex-1 min-w-[110px]">Notificações</TabsTrigger>
            <TabsTrigger value="kanban" className="flex-1 min-w-[110px]">Kanban</TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="email" className="flex-1 min-w-[140px]">E-mail & Alertas</TabsTrigger>
                <TabsTrigger value="sms" className="flex-1 min-w-[110px]">SMS</TabsTrigger>
                <TabsTrigger value="relatorios" className="flex-1 min-w-[110px]">Relatórios</TabsTrigger>
                <TabsTrigger value="layout" className="flex-1 min-w-[110px]">Layout</TabsTrigger>
              </>
            )}
            {isMaster && (
              <TabsTrigger value="landing" className="flex-1 min-w-[120px]">Landing Page</TabsTrigger>
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
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Autenticação de Dois Fatores</Label>
                    <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança.</p>
                  </div>
                  <Switch />
                </div>

                {isAdmin && (
                  <>
                    <div className="flex items-center justify-between border-t pt-4">
                      <div className="space-y-0.5">
                        <Label>Política de Senhas</Label>
                        <p className="text-sm text-muted-foreground">
                          Defina regras de complexidade, expiração e troca obrigatória.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => (window.location.href = "/configuracoes/senhas")}
                      >
                        Configurar
                      </Button>
                    </div>
                    <div className="flex items-center justify-between border-t pt-4">
                      <div className="space-y-0.5">
                        <Label>Tempo Limite de Sessão (minutos)</Label>
                        <p className="text-sm text-muted-foreground">
                          Tempo de inatividade antes do logoff automático (ex: 300 para 5h).
                        </p>
                      </div>
                      <div className="w-24">
                        <Input 
                          type="number" 
                          value={sessionTimeout} 
                          onChange={(e) => setSessionTimeout(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}
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
           {isAdmin && (
             <Card>
               <CardHeader>
                 <div className="flex items-center gap-2">
                   <Bell className="h-5 w-5 text-primary" />
                   <CardTitle>Avisos de Encerramento de Acesso</CardTitle>
                 </div>
                 <CardDescription>Configure quando alertar o usuário sobre o fim do horário permitido.</CardDescription>
               </CardHeader>
               <CardContent className="space-y-6">
                 <div className="flex items-center justify-between">
                   <div className="space-y-0.5">
                     <Label>Aviso prévio (minutos antes do fim)</Label>
                     <p className="text-sm text-muted-foreground">Pop-up + notificação avisando que o expediente está acabando.</p>
                   </div>
                   <div className="w-24">
                     <Input type="number" value={accessWarnings.pre_minutes} onChange={e => setAccessWarnings({ ...accessWarnings, pre_minutes: Number(e.target.value) })} />
                   </div>
                 </div>
                 <div className="flex items-center justify-between border-t pt-4">
                   <div className="space-y-0.5">
                     <Label>Aviso final (minutos antes do fim)</Label>
                     <p className="text-sm text-muted-foreground">Segundo alerta crítico antes do logoff.</p>
                   </div>
                   <div className="w-24">
                     <Input type="number" value={accessWarnings.final_minutes} onChange={e => setAccessWarnings({ ...accessWarnings, final_minutes: Number(e.target.value) })} />
                   </div>
                 </div>
                 <div className="flex items-center justify-between border-t pt-4">
                   <div className="space-y-0.5">
                     <Label>Notificações do navegador</Label>
                     <p className="text-sm text-muted-foreground">Mostra alertas mesmo com a aba em segundo plano.</p>
                   </div>
                   <Switch checked={accessWarnings.browser_notify} onCheckedChange={v => setAccessWarnings({ ...accessWarnings, browser_notify: v })} />
                 </div>
               </CardContent>
             </Card>
           )}
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
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2" 
                          onClick={async () => {
                            if (!emailSettings.sender || !emailSettings.smtp_host || !emailSettings.smtp_user || !emailSettings.smtp_pass) {
                              toast({ variant: "destructive", title: "Configuração incompleta", description: "Por favor, preencha todos os campos do servidor SMTP antes de testar." });
                              return;
                            }
                            
                            toast({ title: "Teste de E-mail", description: "Enviando e-mail de teste..." });
                            
                            try {
                              const { data, error } = await supabase.functions.invoke("send-email", {
                                body: {
                                  to: emailSettings.sender,
                                  subject: "Teste de Configuração - Sistema de Chamados",
                                  html: `<p>Este é um e-mail de teste para validar as configurações de SMTP do seu sistema.</p><p>Se você recebeu este e-mail, a configuração está correta!</p>`,
                                  settings: emailSettings
                                }
                              });
                              
                              if (error) throw error;
                              if (data?.error) throw new Error(data.error);
                              
                              toast({ title: "Sucesso", description: "E-mail de teste enviado com sucesso para o remetente configurado." });
                            } catch (err: any) {
                              console.error("Erro ao enviar e-mail:", err);
                              toast({ variant: "destructive", title: "Erro no teste", description: err.message || "Não foi possível enviar o e-mail de teste." });
                            }
                          }}
                        >
                         <Mail size={14} /> Testar Conexão
                       </Button>
                     </div>
                     <div className="border-t pt-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-lg font-bold">Modelos de E-mail (Templates)</Label>
                       <Button variant="outline" size="sm" onClick={() => setEmailTemplates([...emailTemplates, { id: Math.random().toString(), name: "Novo Modelo", subject: "", body: "", trigger: "" }])}>
                          <Plus size={14} className="mr-1" /> Adicionar
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mb-4">
                        Tags disponíveis: <code className="bg-muted px-1 rounded">{"{os}"}</code>, <code className="bg-muted px-1 rounded">{"{user}"}</code>, <code className="bg-muted px-1 rounded">{"{titulo}"}</code>, <code className="bg-muted px-1 rounded">{"{status}"}</code>, <code className="bg-muted px-1 rounded">{"{descricao}"}</code>
                      </div>
                      
                       <div className="space-y-6">
                         <div className="space-y-2">
                           <Label className="text-sm font-semibold">Layout Global de E-mail (HTML)</Label>
                           <div className="text-xs text-muted-foreground mb-2">
                             Use <code className="bg-muted px-1 rounded">{"{corpo}"}</code> para indicar onde o texto do modelo será inserido. Você pode usar tags HTML e CSS inline.
                           </div>
                           <textarea 
                             className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                             placeholder="<html><body><div style='...'> {corpo} </div></body></html>"
                             value={emailLayout} 
                             onChange={e => setEmailLayout(e.target.value)}
                           />
                         </div>

                         <div className="space-y-4">
                           <Label className="text-sm font-semibold">Modelos de E-mail</Label>
                           {emailTemplates.map((template, idx) => (
                             <div key={template.id} className="p-4 border rounded-md space-y-4 relative bg-card/50">
                               <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => setEmailTemplates(emailTemplates.filter((_, i) => i !== idx))}>
                                 <Trash2 size={14} />
                               </Button>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                   <Label>Nome do Modelo</Label>
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
                                   <Label>Gatilho (Ação Automática)</Label>
                                   <Select 
                                     value={template.trigger} 
                                     onValueChange={val => {
                                       const nt = [...emailTemplates];
                                       nt[idx].trigger = val;
                                       setEmailTemplates(nt);
                                     }}
                                   >
                                     <SelectTrigger>
                                       <SelectValue placeholder="Selecione um gatilho..." />
                                     </SelectTrigger>
                                     <SelectContent>
                                       <SelectItem value="none">Nenhum (Envio Manual)</SelectItem>
                                       <SelectItem value="new_ticket">Novo Chamado Aberto</SelectItem>
                                       <SelectItem value="status_change">Mudança de Status</SelectItem>
                                       <SelectItem value="new_interaction">Novo Comentário/Interação</SelectItem>
                                       <SelectItem value="ticket_closed">Chamado Encerrado</SelectItem>
                                     </SelectContent>
                                   </Select>
                                 </div>
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
                       </div>
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
                      <Button size="sm" onClick={() => setKanbanConfig([...kanbanConfig, { label: "Novo Status", cor: "#94a3b8" }])}>
                        <Plus size={14} className="mr-1" /> Adicionar Status
                      </Button>
                    </div>
                    <CardDescription>
                      Estas são as colunas reais exibidas no board de Chamados. Colunas novas (sem os botões
                      padrão de Atender/Pausar/Encerrar) recebem apenas os marcadores acima — para ter as mesmas
                      ações rápidas dos status padrão, fale com quem mantém o sistema.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {kanbanConfig.map((col, idx) => (
                      <div key={col.id ?? `new-${idx}`} className="flex items-center gap-4 border p-3 rounded-lg group">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase">Nome da Coluna</Label>
                            <Input value={col.label} onChange={e => { const nc = [...kanbanConfig]; nc[idx].label = e.target.value; setKanbanConfig(nc); }} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase">Cor</Label>
                            <div className="flex items-center gap-2">
                               <Input
                                 type="color"
                                 className="w-10 h-10 p-1"
                                 value={col.cor || "#94a3b8"}
                                 onChange={e => {
                                   const nc = [...kanbanConfig];
                                   nc[idx].cor = e.target.value;
                                   setKanbanConfig(nc);
                                 }}
                               />
                            </div>
                          </div>
                          <div className="md:col-span-2 flex flex-wrap gap-4 pt-1">
                            {[
                              { key: "is_inicial", label: "Status inicial" },
                              { key: "is_pausa", label: "Pausa" },
                              { key: "is_encerrado", label: "Encerrado" },
                              { key: "is_cancelado", label: "Cancelado" },
                            ].map((flag) => (
                              <label key={flag.key} className="flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!col[flag.key]}
                                  onChange={(e) => {
                                    const nc = [...kanbanConfig];
                                    if (flag.key === "is_inicial" && e.target.checked) {
                                      // apenas uma coluna pode ser inicial
                                      nc.forEach((c: any) => { c.is_inicial = false; });
                                    }
                                    nc[idx][flag.key] = e.target.checked;
                                    setKanbanConfig(nc);
                                  }}
                                />
                                {flag.label}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 pt-4">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            disabled={idx === 0} 
                            onClick={() => { 
                              const nc = [...kanbanConfig]; 
                              [nc[idx-1], nc[idx]] = [nc[idx], nc[idx-1]]; 
                              setKanbanConfig(nc); 
                            }}
                          >
                            <ChevronUp size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            disabled={idx === kanbanConfig.length - 1} 
                            onClick={() => { 
                              const nc = [...kanbanConfig]; 
                              [nc[idx], nc[idx+1]] = [nc[idx+1], nc[idx]]; 
                              setKanbanConfig(nc); 
                            }}
                          >
                            <ChevronDown size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive" 
                            onClick={() => setKanbanConfig(kanbanConfig.filter((_, i) => i !== idx))}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    ))}
                   </CardContent>
                 </Card>
 
                 {isAdmin && (
                   <Card>
                     <CardHeader>
                       <div className="flex justify-between items-center">
                         <div className="flex items-center gap-2">
                           <LayoutGrid className="h-5 w-5 text-primary" />
                           <CardTitle>Prioridades de Chamado</CardTitle>
                         </div>
                         <Button size="sm" onClick={() => setPriorities([...priorities, { nome: "Nova Prioridade", cor: "#6e59ff", ordem: priorities.length + 1 }])}>
                           <Plus size={14} className="mr-1" /> Adicionar Prioridade
                         </Button>
                       </div>
                     </CardHeader>
                     <CardContent className="space-y-4">
                       {priorities.map((prio, idx) => (
                         <div key={prio.id || idx} className="flex items-center gap-4 border p-3 rounded-lg group">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                             <div className="space-y-2">
                               <Label className="text-[10px] uppercase">Nome da Prioridade</Label>
                               <Input value={prio.nome} onChange={e => { const np = [...priorities]; np[idx].nome = e.target.value; setPriorities(np); }} />
                             </div>
                             <div className="space-y-2">
                               <Label className="text-[10px] uppercase">Cor</Label>
                               <div className="flex items-center gap-2">
                                 <Input 
                                   type="color" 
                                   className="w-10 h-10 p-1" 
                                   value={prio.cor || "#6e59ff"} 
                                   onChange={e => { 
                                     const np = [...priorities]; 
                                     np[idx].cor = e.target.value; 
                                     setPriorities(np); 
                                   }} 
                                 />
                               </div>
                             </div>
                           </div>
                           <div className="flex flex-col gap-1 pt-4">
                             <Button 
                               variant="ghost" 
                               size="icon" 
                               className="h-8 w-8" 
                               disabled={idx === 0} 
                               onClick={() => { 
                                 const np = [...priorities]; 
                                 [np[idx-1], np[idx]] = [np[idx], np[idx-1]];
                                 // Update ordem
                                 np[idx-1].ordem = idx;
                                 np[idx].ordem = idx + 1;
                                 setPriorities(np); 
                               }}
                             >
                               <ChevronUp size={16} />
                             </Button>
                             <Button 
                               variant="ghost" 
                               size="icon" 
                               className="h-8 w-8" 
                               disabled={idx === priorities.length - 1} 
                               onClick={() => { 
                                 const np = [...priorities]; 
                                 [np[idx], np[idx+1]] = [np[idx+1], np[idx]]; 
                                 // Update ordem
                                 np[idx].ordem = idx + 1;
                                 np[idx+1].ordem = idx + 2;
                                 setPriorities(np); 
                               }}
                             >
                               <ChevronDown size={16} />
                             </Button>
                             <Button 
                               variant="ghost" 
                               size="icon" 
                               className="h-8 w-8 text-destructive" 
                               onClick={async () => {
                                 if (prio.id) {
                                   const { error } = await supabase.from("chamados_prioridades").delete().eq("id", prio.id);
                                   if (error) {
                                      toast({ variant: "destructive", title: "Erro ao excluir", description: "Pode haver chamados vinculados a esta prioridade." });
                                      return;
                                   }
                                 }
                                 setPriorities(priorities.filter((_, i) => i !== idx));
                               }}
                             >
                               <Trash2 size={16} />
                             </Button>
                           </div>
                         </div>
                       ))}
                     </CardContent>
                   </Card>
                 )}
               </TabsContent>

             <TabsContent value="sms" className="space-y-6">
               <Card>
                 <CardHeader>
                   <div className="flex items-center gap-2">
                     <MessageSquareText className="h-5 w-5 text-primary" />
                     <CardTitle>Recuperação de Senha por SMS (Mobizon)</CardTitle>
                   </div>
                   <CardDescription>
                     Configure a integração com a Mobizon para permitir que usuários recebam a senha
                     provisória por SMS, como alternativa ao e-mail. É preciso ter um número de celular
                     cadastrado no campo Telefone do usuário.
                   </CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="space-y-2">
                       <Label>Chave da API (Mobizon)</Label>
                       <Input
                         type="password"
                         placeholder="Sua API Key da Mobizon"
                         value={smsConfig.api_key}
                         onChange={e => setSmsConfig({ ...smsConfig, api_key: e.target.value })}
                       />
                       <p className="text-[10px] text-muted-foreground">Encontrada no painel da Mobizon, em Configurações da conta.</p>
                     </div>
                     <div className="space-y-2">
                       <Label>Remetente (Sender ID)</Label>
                       <Input
                         placeholder="Ex: nome da empresa (opcional)"
                         value={smsConfig.sender_id}
                         onChange={e => setSmsConfig({ ...smsConfig, sender_id: e.target.value })}
                       />
                       <p className="text-[10px] text-muted-foreground">Deixe em branco para usar o remetente padrão da conta Mobizon.</p>
                     </div>
                     <div className="space-y-2">
                       <Label>DDI (Código do País)</Label>
                       <Input
                         placeholder="55"
                         value={smsConfig.ddi}
                         onChange={e => setSmsConfig({ ...smsConfig, ddi: e.target.value.replace(/\D/g, "") })}
                       />
                       <p className="text-[10px] text-muted-foreground">Fixo em 55 (Brasil) — adicionado automaticamente aos números.</p>
                     </div>
                   </div>
                   <div className="flex justify-end">
                     <Button
                       variant="outline"
                       size="sm"
                       className="gap-2"
                       onClick={async () => {
                         if (!smsConfig.api_key) {
                           toast({ variant: "destructive", title: "Configuração incompleta", description: "Informe a chave da API da Mobizon antes de testar." });
                           return;
                         }
                         const numero = prompt("Informe um número de celular para o teste (com DDD, ex: 11999998888):");
                         if (!numero) return;
                         toast({ title: "Teste de SMS", description: "Enviando SMS de teste..." });
                         try {
                           const { data, error } = await supabase.functions.invoke("send-sms", {
                             body: {
                               to: numero,
                               text: "Teste de configuração do Sistema de Chamados. Se você recebeu esta mensagem, a integração com a Mobizon está funcionando.",
                               settings: smsConfig,
                             }
                           });
                           if (error) throw error;
                           if (data?.error) throw new Error(data.error);
                           toast({ title: "Sucesso", description: "SMS de teste enviado." });
                         } catch (err: any) {
                           toast({ variant: "destructive", title: "Erro ao enviar SMS de teste", description: err.message });
                         }
                       }}
                     >
                       <Send size={14} /> Testar Envio
                     </Button>
                   </div>
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
                   <CardContent className="space-y-8">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h3 className="text-sm font-bold">Configurações de Estilo</h3>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label>Mostrar Logo</Label>
                              <Switch checked={reportLayout.showLogo} onCheckedChange={v => setReportLayout({ ...reportLayout, showLogo: v })} />
                            </div>
                            {reportLayout.showLogo && (
                              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                <div className="space-y-2">
                                  <Label className="text-xs">Largura (mm)</Label>
                                  <Input 
                                    type="number" 
                                    className="h-8"
                                    value={reportLayout.logoWidth || 18} 
                                    onChange={e => setReportLayout({ ...reportLayout, logoWidth: Number(e.target.value) })} 
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">Altura (mm)</Label>
                                  <Input 
                                    type="number" 
                                    className="h-8"
                                    value={reportLayout.logoHeight || 18} 
                                    onChange={e => setReportLayout({ ...reportLayout, logoHeight: Number(e.target.value) })} 
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Fundo do Cabeçalho</Label>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-8 h-8 rounded-full border-2 cursor-pointer shadow-sm relative overflow-hidden shrink-0" 
                                  style={{ backgroundColor: reportLayout.headerColor || "#000000" }}
                                >
                                  <Input 
                                    type="color" 
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" 
                                    value={reportLayout.headerColor || "#000000"} 
                                    onChange={e => setReportLayout({ ...reportLayout, headerColor: e.target.value })} 
                                  />
                                </div>
                                <span className="text-[10px] font-mono">{reportLayout.headerColor || "#000000"}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Texto do Cabeçalho</Label>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-8 h-8 rounded-full border-2 cursor-pointer shadow-sm relative overflow-hidden shrink-0" 
                                  style={{ backgroundColor: reportLayout.headerTextColor || "#ffffff" }}
                                >
                                  <Input 
                                    type="color" 
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" 
                                    value={reportLayout.headerTextColor || "#ffffff"} 
                                    onChange={e => setReportLayout({ ...reportLayout, headerTextColor: e.target.value })} 
                                  />
                                </div>
                                <span className="text-[10px] font-mono">{reportLayout.headerTextColor || "#ffffff"}</span>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Texto do Cabeçalho</Label>
                              <Input 
                                value={reportLayout.headerText || ""} 
                                onChange={e => setReportLayout({ ...reportLayout, headerText: e.target.value })} 
                                placeholder="Ex: Relatório Mensal"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Texto do Rodapé</Label>
                              <Input value={reportLayout.footerText || ""} onChange={e => setReportLayout({ ...reportLayout, footerText: e.target.value })} />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold">Visualização do Relatório</h3>
                            <div className="flex gap-2">
                              <Button 
                                variant={reportLayout.logoAlignment === 'left' ? 'secondary' : 'ghost'} 
                                size="sm" 
                                className="h-7 px-2 text-[10px]"
                                onClick={() => setReportLayout({...reportLayout, logoAlignment: 'left'})}
                              >Alinhar Esq.</Button>
                              <Button 
                                variant={reportLayout.logoAlignment === 'center' ? 'secondary' : 'ghost'} 
                                size="sm" 
                                className="h-7 px-2 text-[10px]"
                                onClick={() => setReportLayout({...reportLayout, logoAlignment: 'center'})}
                              >Centralizar</Button>
                            </div>
                          </div>
                          <div 
                            className="border-2 border-dashed rounded-lg overflow-hidden shadow-sm bg-white min-h-[140px] flex flex-col relative"
                            style={{ borderColor: 'hsl(var(--primary)/20)' }}
                          >
                            <div 
                              className={`h-20 flex items-center px-6 transition-all duration-300 relative ${reportLayout.logoAlignment === 'center' ? 'flex-col justify-center text-center gap-1' : 'flex-row'}`}
                              style={{ backgroundColor: reportLayout.headerColor || "#000000" }}
                            >
                              {reportLayout.showLogo && layoutConfig.companyLogo && (
                                <div className="relative">
                                  <img 
                                    src={layoutConfig.companyLogo} 
                                    alt="Logo Preview" 
                                    className="object-contain rounded bg-white/20 p-1"
                                    style={{ 
                                      width: `${(reportLayout.logoWidth || 18) * 2}px`, 
                                      height: `${(reportLayout.logoHeight || 18) * 2}px` 
                                    }} 
                                  />
                                </div>
                              )}
                              <div className="flex flex-col" style={{ color: reportLayout.headerTextColor || "#ffffff" }}>
                                <span className="font-bold text-lg px-1">
                                  {reportLayout.headerText || layoutConfig.companyName || "Relatório de Chamados"}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 p-4 bg-muted/5 flex flex-col gap-2">
                              <div className="h-2 w-full bg-muted/20 rounded" />
                              <div className="grid grid-cols-4 gap-2">
                                {reportLayout.columns?.slice(0, 4).map((c: any) => (
                                  <div key={c.id} className="h-4 bg-primary/10 rounded flex items-center px-2 text-[8px] font-medium text-primary/60">
                                    {c.label}
                                  </div>
                                ))}
                              </div>
                              <div className="h-2 w-3/4 bg-muted/10 rounded" />
                              <div className="h-2 w-1/2 bg-muted/10 rounded" />
                            </div>
                          </div>
                          <div className="border-2 border-dashed rounded-lg p-3 bg-muted/10 text-[10px] flex justify-between items-center text-muted-foreground">
                            <span className="font-medium italic">{reportLayout.footerText || "Rodapé do relatório..."}</span>
                            <span className="opacity-50">Página 1 de 1</span>
                          </div>
                        </div>
                      </div>

                    <div className="space-y-4 border-t pt-6">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold flex items-center gap-2">Colunas do Relatório</h3>
                          <p className="text-xs text-muted-foreground italic">Selecione e organize as informações que aparecerão nas exportações.</p>
                        </div>
                        <Select onValueChange={(val) => {
                          const options: Record<string, string> = {
                            encerrado_em: 'Data de Encerramento',
                            atendido_em: 'Início de Atendimento',
                            descricao: 'Descrição',
                            usuario: 'Solicitante',
                            sla_deadline: 'Prazo SLA',
                            descricao_encerramento: 'Motivo Encerramento'
                          };
                          if (reportLayout.columns.find((c: any) => c.field === val)) return;
                          const newCols = [...reportLayout.columns, { 
                            id: val + Math.random().toString(36).substr(2, 4), 
                            label: options[val], 
                            visible: true, 
                            field: val 
                          }];
                          setReportLayout({...reportLayout, columns: newCols});
                        }}>
                          <SelectTrigger className="w-[180px] h-8 text-xs">
                            <Plus size={14} className="mr-2" /> Adicionar Coluna
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="encerrado_em">Data de Encerramento</SelectItem>
                            <SelectItem value="atendido_em">Início de Atendimento</SelectItem>
                            <SelectItem value="descricao">Descrição</SelectItem>
                            <SelectItem value="usuario">Solicitante</SelectItem>
                            <SelectItem value="sla_deadline">Prazo SLA</SelectItem>
                            <SelectItem value="descricao_encerramento">Motivo Encerramento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 max-w-md">
                        {reportLayout.columns?.map((col: any, i: number) => (
                          <div key={col.id} className="flex items-center gap-3 border p-2 rounded bg-muted/10 group">
                            <div className="flex flex-col gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4 w-4" 
                                disabled={i === 0}
                                onClick={() => {
                                  const newCols = [...reportLayout.columns];
                                  [newCols[i-1], newCols[i]] = [newCols[i], newCols[i-1]];
                                  setReportLayout({...reportLayout, columns: newCols});
                                }}
                              >
                                <ChevronUp size={10} />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4 w-4" 
                                disabled={i === reportLayout.columns.length - 1}
                                onClick={() => {
                                  const newCols = [...reportLayout.columns];
                                  [newCols[i], newCols[i+1]] = [newCols[i+1], newCols[i]];
                                  setReportLayout({...reportLayout, columns: newCols});
                                }}
                              >
                                <ChevronDown size={10} />
                              </Button>
                            </div>
                            <Input 
                              className="h-8 text-xs" 
                              value={col.label} 
                              onChange={e => {
                                const newCols = [...reportLayout.columns];
                                newCols[i].label = e.target.value;
                                setReportLayout({...reportLayout, columns: newCols});
                              }}
                            />
                            <Switch 
                              checked={col.visible} 
                              onCheckedChange={v => {
                                const newCols = [...reportLayout.columns];
                                newCols[i].visible = v;
                                setReportLayout({...reportLayout, columns: newCols});
                              }}
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                              onClick={() => {
                                const newCols = reportLayout.columns.filter((_: any, idx: number) => idx !== i);
                                setReportLayout({...reportLayout, columns: newCols});
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

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
                         <h3 className="text-sm font-bold flex items-center gap-2"><ImageIcon size={16} /> Identidade Visual</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div className="flex flex-col gap-2">
                             <Label className="text-[10px] uppercase">Logo da Empresa</Label>
                             <div className="flex items-center gap-4 border p-4 rounded-lg bg-muted/30 h-[100px]">
                               <div className="w-12 h-12 rounded border bg-background flex items-center justify-center overflow-hidden shrink-0">
                                 {layoutConfig.companyLogo ? (
                                   <img src={layoutConfig.companyLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                                 ) : (
                                   <ImageIcon size={24} className="text-muted-foreground opacity-20" />
                                 )}
                               </div>
                               <div className="flex-1 space-y-2">
                                 <Label htmlFor="logo-upload" className="cursor-pointer">
                                   <div className="flex items-center gap-2 text-[10px] bg-primary text-primary-foreground px-2 py-1.5 rounded-md hover:bg-primary/90 transition-colors w-fit">
                                     <Upload size={12} /> Selecionar Logo
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
                               </div>
                             </div>
                           </div>

                           <div className="flex flex-col gap-2">
                             <Label className="text-[10px] uppercase">Favicon (Guia do Navegador)</Label>
                             <div className="flex items-center gap-4 border p-4 rounded-lg bg-muted/30 h-[100px]">
                               <div className="w-12 h-12 rounded border bg-background flex items-center justify-center overflow-hidden shrink-0">
                                 {layoutConfig.companyFavicon ? (
                                   <img src={layoutConfig.companyFavicon} alt="Favicon" className="w-8 h-8 object-contain" />
                                 ) : (
                                   <ImageIcon size={24} className="text-muted-foreground opacity-20" />
                                 )}
                               </div>
                               <div className="flex-1 space-y-2">
                                 <Label htmlFor="favicon-upload" className="cursor-pointer">
                                   <div className="flex items-center gap-2 text-[10px] bg-primary text-primary-foreground px-2 py-1.5 rounded-md hover:bg-primary/90 transition-colors w-fit">
                                     <Upload size={12} /> Selecionar Ícone
                                   </div>
                                 </Label>
                                 <Input 
                                   id="favicon-upload" 
                                   type="file" 
                                   className="hidden" 
                                   accept="image/*" 
                                   onChange={async (e) => {
                                     const file = e.target.files?.[0];
                                     if (file) {
                                       const reader = new FileReader();
                                       reader.onload = (re) => {
                                         setLayoutConfig({...layoutConfig, companyFavicon: re.target?.result as string});
                                       };
                                       reader.readAsDataURL(file);
                                     }
                                   }}
                                 />
                               </div>
                             </div>
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
                       <p className="text-xs text-muted-foreground italic">Reordene os menus ou altere os nomes de exibição.</p>
                       <div className="space-y-2 max-w-md">
                         {layoutConfig.menuOrder?.map((menu: any, i: number) => (
                           <div key={menu.id || i} className="flex items-center gap-2 border p-2 rounded bg-muted/10">
                             <div className="flex flex-col gap-1">
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-4 w-4" 
                                 disabled={i === 0}
                                 onClick={() => {
                                   const newOrder = [...layoutConfig.menuOrder];
                                   [newOrder[i-1], newOrder[i]] = [newOrder[i], newOrder[i-1]];
                                   setLayoutConfig({...layoutConfig, menuOrder: newOrder});
                                 }}
                               >
                                 <ChevronUp size={10} />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-4 w-4" 
                                 disabled={i === layoutConfig.menuOrder.length - 1}
                                 onClick={() => {
                                   const newOrder = [...layoutConfig.menuOrder];
                                   [newOrder[i], newOrder[i+1]] = [newOrder[i+1], newOrder[i]];
                                   setLayoutConfig({...layoutConfig, menuOrder: newOrder});
                                 }}
                               >
                                 <ChevronDown size={10} />
                               </Button>
                             </div>
                             <Input 
                               value={menu.label} 
                               onChange={(e) => {
                                 const newOrder = [...layoutConfig.menuOrder];
                                 newOrder[i].label = e.target.value;
                                 setLayoutConfig({...layoutConfig, menuOrder: newOrder});
                               }}
                               className="h-8 text-sm" 
                             />
                             <div className="flex gap-1 ml-auto">
                               <Switch 
                                 checked={menu.visible !== false} 
                                 onCheckedChange={(checked) => {
                                   const newOrder = [...layoutConfig.menuOrder];
                                   newOrder[i].visible = checked;
                                   setLayoutConfig({...layoutConfig, menuOrder: newOrder});
                                 }}
                               />
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                  </CardContent>
                </Card>
               </TabsContent>
           </>
         )}

         {isMaster && (
           <TabsContent value="landing" className="space-y-6">
             <Card>
               <CardHeader>
                 <div className="flex items-center gap-2">
                   <Sparkles className="h-5 w-5 text-primary" />
                   <CardTitle>Página de Login (Landing)</CardTitle>
                 </div>
                  <CardDescription>
                    Clique em qualquer texto para editar. Arraste os itens em destaque para reordenar.
                    As alterações só vão ao ar quando você clicar em <strong>Salvar Alterações</strong>.
                  </CardDescription>
               </CardHeader>
                <CardContent>
                  <LandingLiveEditor config={landingConfig} setConfig={setLandingConfig} />
                </CardContent>
             </Card>
           </TabsContent>
         )}
       </Tabs>
     </div>
   );
}
