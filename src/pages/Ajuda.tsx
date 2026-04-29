  import RichTextEditor from "@/components/RichTextEditor";

 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { usePermissions } from "@/hooks/usePermissions";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Edit3, Eye, Crown, Shield, Wrench, User, HelpCircle, BookOpen, ChevronRight, LayoutDashboard, Ticket, Users, Key, FileText, Building2, Settings, History, ArrowLeft, AlertTriangle, ScrollText } from "lucide-react";
 import { useToast } from "@/hooks/use-toast";
 import { Textarea } from "@/components/ui/textarea";
 import { Input } from "@/components/ui/input";
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from "@/components/ui/alert-dialog";
 
 export default function Ajuda() {
   const { isMaster, isAdmin, loading: permsLoading } = usePermissions();
   const [manuals, setManuals] = useState<any[]>([]);
   const [menuManuals, setMenuManuals] = useState<any[]>([]);
   const [roleDefinitions, setRoleDefinitions] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showExitDialog, setShowExitDialog] = useState(false);
    const [pendingExitAction, setPendingExitAction] = useState<"visualize" | "back" | null>(null);
   const [activeTab, setActiveTab] = useState("");
   const { toast } = useToast();
 
   const fetchManuals = async () => {
     setIsLoading(true);
     try {
       const [manualsRes, menuManualsRes, rolesRes] = await Promise.all([
         supabase.from("system_manuals").select("*").order("role_key"),
         supabase.from("help_menu_manuals").select("*").order("title"),
         supabase.from("role_definitions").select("*")
       ]);

       if (manualsRes.error) throw manualsRes.error;
       if (menuManualsRes.error) throw menuManualsRes.error;
       if (rolesRes.error) throw rolesRes.error;

       setManuals(manualsRes.data || []);
       setMenuManuals(menuManualsRes.data || []);
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
 
    const handleSave = async (manual: any, isMenuManual = false, silent = false) => {
      try {
        const table = isMenuManual ? "help_menu_manuals" : "system_manuals";
        const { error } = await supabase
          .from(table)
          .update({ 
            content: manual.content,
            title: manual.title,
            updated_at: new Date().toISOString()
          })
          .eq("id", manual.id);
  
        if (error) throw error;
        if (!silent) {
          toast({ title: "Sucesso", description: "Manual atualizado com sucesso!" });
        }
        // After saving one, we don't necessarily know if others are clean, 
        // but the user just clicked "Save" on this specific one.
        // For simplicity, we'll keep hasChanges as true unless they use saveAll
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
        throw error;
      }
    };

    const handleSaveAll = async () => {
      try {
        setIsLoading(true);
        // Save all manuals
        for (const manual of manuals) {
          await handleSave(manual, false, true);
        }
        // Save all menu manuals
        for (const menuManual of menuManuals) {
          await handleSave(menuManual, true, true);
        }
        
        setHasChanges(false);
        toast({ title: "Sucesso", description: "Todas as alterações foram salvas!" });
        setIsEditing(false);
        fetchManuals();
      } catch (error) {
        // Toast already shown in handleSave
      } finally {
        setIsLoading(false);
      }
    };

    const handleExitEdit = (action: "visualize" | "back") => {
      if (hasChanges) {
        setPendingExitAction(action);
        setShowExitDialog(true);
      } else {
        setIsEditing(false);
        if (action === "back") {
          // Action is the same for now, but keeping the param for clarity
        }
      }
    };

    const discardChanges = () => {
      setHasChanges(false);
      setIsEditing(false);
      setShowExitDialog(false);
      fetchManuals(); // Reload original data
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
        if (roleKey.toUpperCase() === 'MASTER') {
          return menuManuals;
        }
        return [];
      }
      
      const permissions = roleDef.permissions || [];
      
      if (permissions.includes("Acesso Total") || roleKey.toUpperCase() === 'MASTER') {
        return menuManuals;
      }

      return menuManuals.filter(m => permissions.includes(m.menu_id));
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
          <div className="flex gap-2">
            {isEditing && (
              <Button 
                variant="outline" 
                onClick={() => handleExitEdit("back")}
                className="gap-2"
              >
                <ArrowLeft size={18} />
                Voltar
              </Button>
            )}
            {canEdit && (
              <Button 
                variant={isEditing ? "secondary" : "default"} 
                onClick={() => isEditing ? handleExitEdit("visualize") : setIsEditing(true)}
                className="gap-2"
              >
                {isEditing ? <Eye size={18} /> : <Edit3 size={18} />}
                {isEditing ? "Visualizar" : "Editar Manuais"}
              </Button>
            )}
          </div>
       </div>
 
       {visibleManuals.length === 0 ? (
         <Card>
           <CardContent className="py-10 text-center text-muted-foreground">
             Nenhum manual disponível para o seu nível de acesso.
           </CardContent>
         </Card>
       ) : (
         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full overflow-x-auto justify-start md:grid md:grid-cols-4 h-auto p-1 bg-muted/50">
             {visibleManuals.map((m) => {
               const label = m.role_key === "TECNICO" ? "Técnico" : 
                            m.role_key === "USUARIO" ? "Usuário" : 
                            m.role_key.charAt(0) + m.role_key.slice(1).toLowerCase();
               return (
                  <TabsTrigger key={m.role_key} value={m.role_key} className="gap-2 py-2 md:py-1 px-4 md:px-2 min-w-max md:min-w-0">
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
                          setHasChanges(true);
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
                      <Tabs defaultValue="intro" className="w-full">
                         <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 mb-4 h-auto gap-2 sm:gap-0">
                           <TabsTrigger value="intro" className="py-2">Introdução do Perfil</TabsTrigger>
                           <TabsTrigger value="menus" className="py-2">Manuais por Menu</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="intro" className="space-y-4">
                          <div className="p-4 border rounded-lg bg-muted/30">
                            <h4 className="font-bold mb-2">Introdução Geral - {manual.role_key}</h4>
                             <RichTextEditor 
                               content={manual.content} 
                               onChange={(content) => {
                                 const next = [...manuals];
                                 const idx = next.findIndex(m => m.id === manual.id);
                                 next[idx].content = content;
                                 setManuals(next);
                                 setHasChanges(true);
                               }} 
                             />
                          </div>
                          <div className="flex justify-end">
                            <Button onClick={() => handleSave(manual)} className="gap-2">
                              <Save size={18} /> Salvar Introdução
                            </Button>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="menus" className="space-y-6">
                          <div className="space-y-8">
                            {getMenuSections(manual.role_key).map((section) => (
                              <div key={section.id} className="p-4 border rounded-lg space-y-4 bg-background">
                                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                   <div className="flex items-center gap-2 flex-1">
                                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                       {section.menu_id === 'dashboard' ? <LayoutDashboard className="h-4 w-4" /> :
                                        section.menu_id === 'chamados' ? <Ticket className="h-4 w-4" /> :
                                        section.menu_id === 'usuarios' ? <Users className="h-4 w-4" /> :
                                        section.menu_id === 'permissoes' ? <Key className="h-4 w-4" /> :
                                        section.menu_id === 'relatorios' ? <FileText className="h-4 w-4" /> :
                                        section.menu_id === 'departamentos' ? <Building2 className="h-4 w-4" /> :
                                        section.menu_id === 'configuracoes' ? <Settings className="h-4 w-4" /> :
                                        section.menu_id === 'audit' ? <History className="h-4 w-4" /> :
                                        section.menu_id === 'ajuda' ? <HelpCircle className="h-4 w-4" /> :
                                        <ScrollText className="h-4 w-4" />}
                                    </div>
                                     <div className="flex-1 min-w-0">
                                       <Input 
                                         value={section.title} 
                                         onChange={(e) => {
                                           const next = [...menuManuals];
                                           const idx = next.findIndex(m => m.id === section.id);
                                           next[idx].title = e.target.value;
                                           setMenuManuals(next);
                                           setHasChanges(true);
                                         }}
                                         className="font-bold text-lg w-full bg-transparent border-primary/20 focus:border-primary transition-all"
                                         placeholder="Título do menu"
                                       />
                                     </div>
                                  </div>
                                  <Button 
                                     size="sm"
                                     variant="outline"
                                    onClick={() => handleSave(section, true)}
                                     className="gap-1 h-9 px-4 sm:w-auto w-full border-primary/30 text-primary hover:bg-primary/10"
                                  >
                                    <Save size={14} /> Salvar Menu
                                  </Button>
                                </div>
                                 <RichTextEditor 
                                   content={section.content} 
                                   onChange={(content) => {
                                     const next = [...menuManuals];
                                     const idx = next.findIndex(m => m.id === section.id);
                                     next[idx].content = content;
                                     setMenuManuals(next);
                                     setHasChanges(true);
                                   }} 
                                 />
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                      </Tabs>
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
                                      {section.menu_id === 'dashboard' && <LayoutDashboard className="h-5 w-5" />}
                                      {section.menu_id === 'chamados' && <Ticket className="h-5 w-5" />}
                                      {section.menu_id === 'usuarios' && <Users className="h-5 w-5" />}
                                      {section.menu_id === 'permissoes' && <Key className="h-5 w-5" />}
                                      {section.menu_id === 'relatorios' && <FileText className="h-5 w-5" />}
                                      {section.menu_id === 'departamentos' && <Building2 className="h-5 w-5" />}
                                      {section.menu_id === 'configuracoes' && <Settings className="h-5 w-5" />}
                                      {section.menu_id === 'audit' && <History className="h-5 w-5" />}
                                      {section.menu_id === 'ajuda' && <HelpCircle className="h-5 w-5" />}
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

        <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-2 text-warning mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
              </div>
              <AlertDialogDescription>
                Você possui alterações que ainda não foram salvas. Deseja salvar antes de sair da edição ou descartar as mudanças?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel onClick={() => setShowExitDialog(false)}>Cancelar</AlertDialogCancel>
              <Button variant="outline" onClick={discardChanges} className="sm:mr-auto">
                Descartar
              </Button>
              <AlertDialogAction onClick={handleSaveAll}>
                Salvar e Sair
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }