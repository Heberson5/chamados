import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";
 import { Bell, Moon, Sun, Monitor, Shield, Globe, LayoutGrid, FileText, Save, Loader2 } from "lucide-react";
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
         if (kConfig) setKanbanConfig(kConfig.value);
         if (rLayout) setReportLayout(rLayout.value);
       }
     };
     loadSettings();
   }, []);
 
   const saveSettings = async () => {
     setLoading(true);
     try {
       const { error: kError } = await supabase.from("system_settings").upsert({
         key: 'kanban_config',
         value: kanbanConfig,
         updated_at: new Date().toISOString()
       });
       if (kError) throw kError;
 
       const { error: rError } = await supabase.from("system_settings").upsert({
         key: 'report_layout',
         value: reportLayout,
         updated_at: new Date().toISOString()
       });
       if (rError) throw rError;
 
       toast({ title: "Sucesso", description: "Configurações salvas com sucesso!" });
     } catch (error: any) {
       toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
     } finally {
       setLoading(false);
     }
   };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Ajuste as preferências do sistema e sua experiência.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              <CardTitle>Aparência</CardTitle>
            </div>
            <CardDescription>Personalize como o Help-Me aparece no seu dispositivo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tema do Sistema</Label>
                <p className="text-sm text-muted-foreground">Escolha entre o modo claro, escuro ou automático.</p>
              </div>
              <div className="flex bg-muted p-1 rounded-lg gap-1">
                <button
                  onClick={() => setTheme("light")}
                  className={`p-2 rounded-md transition-all ${theme === "light" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title="Modo Claro"
                >
                  <Sun size={18} />
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`p-2 rounded-md transition-all ${theme === "dark" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title="Modo Escuro"
                >
                  <Moon size={18} />
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`p-2 rounded-md transition-all ${theme === "system" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title="Modo Automático"
                >
                  <Monitor size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-6">
              <div className="space-y-0.5">
                <Label>Idioma</Label>
                <p className="text-sm text-muted-foreground">Selecione o idioma da interface.</p>
              </div>
              <Select defaultValue="pt-BR">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecione o idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Notificações</CardTitle>
            </div>
            <CardDescription>Escolha quais notificações você deseja receber.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificações por E-mail</Label>
                <p className="text-sm text-muted-foreground">Receba atualizações de chamados por e-mail.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between border-t pt-6">
              <div className="space-y-0.5">
                <Label>Alertas de SLA</Label>
                <p className="text-sm text-muted-foreground">Seja avisado quando um chamado estiver prestes a vencer.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between border-t pt-6">
              <div className="space-y-0.5">
                <Label>Novos Chamados</Label>
                <p className="text-sm text-muted-foreground">Notificar quando um novo chamado for atribuído a você.</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

         <Card>
           <CardHeader>
             <div className="flex items-center gap-2">
               <Shield className="h-5 w-5 text-primary" />
               <CardTitle>Segurança</CardTitle>
             </div>
             <CardDescription>Gerencie a segurança da sua conta.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-6">
             <div className="flex items-center justify-between">
               <div className="space-y-0.5">
                 <Label>Autenticação de Dois Fatores</Label>
                 <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança.</p>
               </div>
               <Switch />
             </div>
           </CardContent>
         </Card>
 
         {isAdmin && (
           <>
             <Card>
               <CardHeader>
                 <div className="flex items-center gap-2">
                   <LayoutGrid className="h-5 w-5 text-primary" />
                   <CardTitle>Personalizar Kanban</CardTitle>
                 </div>
                 <CardDescription>Altere a ordem, nomes e cores das colunas do Kanban.</CardDescription>
               </CardHeader>
               <CardContent className="space-y-6">
                 {kanbanConfig.map((col, idx) => (
                   <div key={col.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-4 last:border-0 last:pb-0">
                     <div className="space-y-2">
                       <Label>Nome da Coluna</Label>
                       <Input 
                         value={col.title} 
                         onChange={(e) => {
                           const newConfig = [...kanbanConfig];
                           newConfig[idx].title = e.target.value;
                           setKanbanConfig(newConfig);
                         }}
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>Cor (CSS Class)</Label>
                       <Input 
                         value={col.color} 
                         onChange={(e) => {
                           const newConfig = [...kanbanConfig];
                           newConfig[idx].color = e.target.value;
                           setKanbanConfig(newConfig);
                         }}
                         placeholder="Ex: bg-blue-500/10"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>Ações</Label>
                       <div className="flex gap-2">
                         <Button 
                           variant="outline" 
                           size="sm" 
                           disabled={idx === 0}
                           onClick={() => {
                             const newConfig = [...kanbanConfig];
                             [newConfig[idx-1], newConfig[idx]] = [newConfig[idx], newConfig[idx-1]];
                             setKanbanConfig(newConfig);
                           }}
                         >Subir</Button>
                         <Button 
                           variant="outline" 
                           size="sm" 
                           disabled={idx === kanbanConfig.length - 1}
                           onClick={() => {
                             const newConfig = [...kanbanConfig];
                             [newConfig[idx+1], newConfig[idx]] = [newConfig[idx], newConfig[idx+1]];
                             setKanbanConfig(newConfig);
                           }}
                         >Baixar</Button>
                       </div>
                     </div>
                   </div>
                 ))}
               </CardContent>
             </Card>
 
             <Card>
               <CardHeader>
                 <div className="flex items-center gap-2">
                   <FileText className="h-5 w-5 text-primary" />
                   <CardTitle>Layout de Relatórios (PDF)</CardTitle>
                 </div>
                 <CardDescription>Personalize o visual dos relatórios exportados em PDF.</CardDescription>
               </CardHeader>
               <CardContent className="space-y-6">
                 <div className="flex items-center justify-between">
                   <div className="space-y-0.5">
                     <Label>Mostrar Logo no Cabeçalho</Label>
                   </div>
                   <Switch 
                     checked={reportLayout.showLogo} 
                     onCheckedChange={(v) => setReportLayout({...reportLayout, showLogo: v})} 
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Cor do Cabeçalho (HEX)</Label>
                   <div className="flex gap-2">
                     <Input 
                       type="color" 
                       className="w-12 p-1 h-10" 
                       value={reportLayout.headerColor || "#000000"} 
                       onChange={(e) => setReportLayout({...reportLayout, headerColor: e.target.value})}
                     />
                     <Input 
                       value={reportLayout.headerColor || "#000000"} 
                       onChange={(e) => setReportLayout({...reportLayout, headerColor: e.target.value})}
                     />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <Label>Texto do Rodapé</Label>
                   <Input 
                     value={reportLayout.footerText || ""} 
                     onChange={(e) => setReportLayout({...reportLayout, footerText: e.target.value})}
                   />
                 </div>
               </CardContent>
             </Card>
 
             <div className="flex justify-end">
               <Button onClick={saveSettings} disabled={loading} className="gap-2">
                 {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={18} />}
                 Salvar Todas as Configurações
               </Button>
             </div>
           </>
         )}
      </div>
    </div>
  );
}
