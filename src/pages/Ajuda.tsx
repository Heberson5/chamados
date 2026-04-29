  import RichTextEditor from "@/components/RichTextEditor";

 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { usePermissions } from "@/hooks/usePermissions";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Loader2, Save, Edit3, Eye, Crown, Shield, Wrench, User, HelpCircle, BookOpen, ChevronRight, LayoutDashboard, Ticket, Users, Key, FileText, Building2, Settings, History } from "lucide-react";
 import { useToast } from "@/hooks/use-toast";
 import { Textarea } from "@/components/ui/textarea";
 import { Input } from "@/components/ui/input";
 
 export default function Ajuda() {
   const { isMaster, isAdmin, loading: permsLoading } = usePermissions();
   const [manuals, setManuals] = useState<any[]>([]);
   const [roleDefinitions, setRoleDefinitions] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [isEditing, setIsEditing] = useState(false);
   const [activeTab, setActiveTab] = useState("");
   const { toast } = useToast();
 
   const fetchManuals = async () => {
     setIsLoading(true);
     try {
       const [manualsRes, rolesRes] = await Promise.all([
         supabase.from("system_manuals").select("*").order("role_key"),
         supabase.from("role_definitions").select("*")
       ]);

       if (manualsRes.error) throw manualsRes.error;
       if (rolesRes.error) throw rolesRes.error;

       setManuals(manualsRes.data || []);
       setRoleDefinitions(rolesRes.data || []);

       if (manualsRes.data && manualsRes.data.length > 0) {
         setActiveTab(manualsRes.data[0].role_key);
       }
     } catch (error: any) {
       toast({ variant: "destructive", title: "Erro ao carregar manuais", description: error.message });
     } finally {
       setIsLoading(false);
     }
   };
 
   useEffect(() => {
     if (!permsLoading) {
       fetchManuals();
     }
   }, [permsLoading]);
 
   const handleSave = async (manual: any) => {
     try {
       const { error } = await supabase
         .from("system_manuals")
         .update({ 
           content: manual.content,
           title: manual.title,
           updated_at: new Date().toISOString()
         })
         .eq("id", manual.id);
 
       if (error) throw error;
       toast({ title: "Sucesso", description: "Manual atualizado com sucesso!" });
       setIsEditing(false);
       fetchManuals();
     } catch (error: any) {
       toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
     }
   };
 
   if (isLoading || permsLoading) {
     return (
       <div className="flex h-[50vh] items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
 
   const canEdit = isMaster || isAdmin;
   
    const getMenuSections = (roleKey: string) => {
      const roleNameMap: Record<string, string> = {
        'MASTER': 'Master',
        'ADMIN': 'Administrador',
        'TECNICO': 'Técnico',
        'USUARIO': 'Usuário'
      };
      
      const targetName = roleNameMap[roleKey.toUpperCase()] || roleKey;
      const roleDef = roleDefinitions.find(r => r.name.toUpperCase() === targetName.toUpperCase());
      
      if (!roleDef) {
        // Special case for Master if no definition found
        if (roleKey.toUpperCase() === 'MASTER') {
          return Object.keys(MENU_HELP_CONTENT).map(menuId => ({
            id: menuId,
            ...MENU_HELP_CONTENT[menuId]
          }));
        }
        return [];
      }
      
      const permissions = roleDef.permissions || [];
      
      // If Master has "Acesso Total", show all
      if (permissions.includes("Acesso Total") || roleKey.toUpperCase() === 'MASTER') {
        return Object.keys(MENU_HELP_CONTENT).map(menuId => ({
          id: menuId,
          ...MENU_HELP_CONTENT[menuId]
        }));
      }

      return Object.keys(MENU_HELP_CONTENT)
        .filter(menuId => permissions.includes(menuId))
        .map(menuId => ({
          id: menuId,
          ...MENU_HELP_CONTENT[menuId]
        }));
    };

    const visibleManuals = manuals;
   const getRoleIcon = (role: string) => {
     switch (role.toUpperCase()) {
       case "MASTER": return <Crown className="h-4 w-4" />;
       case "ADMIN": return <Shield className="h-4 w-4" />;
       case "TECNICO": return <Wrench className="h-4 w-4" />;
       case "USUARIO": return <User className="h-4 w-4" />;
       default: return <BookOpen className="h-4 w-4" />;
     }
   };
 
   return (
     <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 animate-fade-in">
       <div className="flex justify-between items-center">
         <div>
           <h1 className="text-3xl font-bold tracking-tight">Centro de Ajuda</h1>
           <p className="text-muted-foreground">Consulte os manuais de utilização do sistema.</p>
         </div>
         {canEdit && (
           <Button 
             variant={isEditing ? "outline" : "default"} 
             onClick={() => setIsEditing(!isEditing)}
             className="gap-2"
           >
             {isEditing ? <Eye size={18} /> : <Edit3 size={18} />}
             {isEditing ? "Visualizar" : "Editar Manuais"}
           </Button>
         )}
       </div>
 
       {visibleManuals.length === 0 ? (
         <Card>
           <CardContent className="py-10 text-center text-muted-foreground">
             Nenhum manual disponível para o seu nível de acesso.
           </CardContent>
         </Card>
       ) : (
         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
           <TabsList className="flex w-full overflow-x-auto justify-start md:grid md:grid-cols-4">
             {visibleManuals.map((m) => {
               const label = m.role_key === "TECNICO" ? "Técnico" : 
                            m.role_key === "USUARIO" ? "Usuário" : 
                            m.role_key.charAt(0) + m.role_key.slice(1).toLowerCase();
               return (
                 <TabsTrigger key={m.role_key} value={m.role_key} className="gap-2">
                   {getRoleIcon(m.role_key)}
                   {label}
                 </TabsTrigger>
               );
             })}
           </TabsList>
 
           {visibleManuals.map((manual) => (
             <TabsContent key={manual.role_key} value={manual.role_key} className="mt-6">
               <Card>
                 <CardHeader>
                   {isEditing ? (
                     <Input 
                       value={manual.title} 
                       onChange={(e) => {
                         const next = [...manuals];
                         const idx = next.findIndex(m => m.id === manual.id);
                         next[idx].title = e.target.value;
                         setManuals(next);
                       }}
                       className="text-2xl font-bold"
                     />
                   ) : (
                     <CardTitle className="text-2xl">{manual.title}</CardTitle>
                   )}
                   <CardDescription>
                     Última atualização: {new Date(manual.updated_at).toLocaleDateString()}
                   </CardDescription>
                 </CardHeader>
                   <CardContent className="space-y-6">
                     {!isEditing && (
                       <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10 mb-2">
                         <div className="bg-primary/10 p-2 rounded-full">
                           <HelpCircle className="h-5 w-5 text-primary" />
                         </div>
                         <div>
                           <h4 className="font-semibold text-sm">Instruções de Uso</h4>
                           <p className="text-xs text-muted-foreground">Siga os passos abaixo para extrair o máximo do sistema.</p>
                         </div>
                       </div>
                     )}
                     
                    {isEditing ? (
                      <div className="space-y-4">
                        <Textarea 
                          value={manual.content} 
                          onChange={(e) => {
                            const next = [...manuals];
                            const idx = next.findIndex(m => m.id === manual.id);
                            next[idx].content = e.target.value;
                            setManuals(next);
                          }}
                          className="min-h-[400px] font-mono text-sm"
                          placeholder="Escreva o conteúdo em HTML..."
                        />
                        <div className="flex justify-end">
                          <Button onClick={() => handleSave(manual)} className="gap-2">
                            <Save size={18} /> Salvar Alterações
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="space-y-12">
                          {/* General Intro Section */}
                          <section className="prose prose-slate dark:prose-invert max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: manual.content }} />
                          </section>

                          {/* Dynamic Menu Sections */}
                          <div className="space-y-8 border-t pt-12">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                              <BookOpen className="h-5 w-5" />
                              Guia Detalhado por Menu
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-6">
                              {getMenuSections(manual.role_key).map((section) => (
                                <div key={section.id} className="group p-6 rounded-xl border bg-card hover:border-primary/50 transition-all shadow-sm">
                                  <div className="flex items-start gap-4 mb-4">
                                    <div className="mt-1 p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                      {section.id === 'dashboard' && <LayoutDashboard className="h-5 w-5" />}
                                      {section.id === 'chamados' && <Ticket className="h-5 w-5" />}
                                      {section.id === 'usuarios' && <Users className="h-5 w-5" />}
                                      {section.id === 'permissoes' && <Key className="h-5 w-5" />}
                                      {section.id === 'relatorios' && <FileText className="h-5 w-5" />}
                                      {section.id === 'departamentos' && <Building2 className="h-5 w-5" />}
                                      {section.id === 'configuracoes' && <Settings className="h-5 w-5" />}
                                      {section.id === 'audit' && <History className="h-5 w-5" />}
                                      {section.id === 'ajuda' && <HelpCircle className="h-5 w-5" />}
                                    </div>
                                    <div>
                                      <h4 className="text-lg font-bold">{section.title}</h4>
                                      <p className="text-xs text-muted-foreground">Funcionalidades e instruções do menu {section.title}</p>
                                    </div>
                                  </div>
                                  <div 
                                    className="prose prose-slate dark:prose-invert max-w-none text-sm 
                                               prose-p:text-muted-foreground prose-p:leading-relaxed
                                               prose-li:text-muted-foreground prose-strong:text-foreground"
                                    dangerouslySetInnerHTML={{ __html: section.content }} 
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                 </CardContent>
               </Card>
             </TabsContent>
           ))}
         </Tabs>
       )}
     </div>
   );
 }