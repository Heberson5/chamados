 const MENU_HELP_CONTENT: Record<string, { title: string; content: string }> = {
   dashboard: {
     title: "Dashboard e Indicadores",
     content: `
       <div class="space-y-4">
         <p>O <strong>Dashboard</strong> é sua torre de controle. Aqui você visualiza o pulso da operação em tempo real.</p>
         <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
           <div class="p-3 border rounded-lg bg-card">
             <h4 class="font-bold text-primary mb-1">Indicadores Principais</h4>
             <ul class="text-sm list-disc pl-4 space-y-1">
               <li><strong>Chamados Abertos:</strong> Total de solicitações aguardando ação.</li>
               <li><strong>Em Atendimento:</strong> Trabalho sendo realizado no momento.</li>
               <li><strong>SLA de Solução:</strong> Percentual de chamados resolvidos no prazo.</li>
             </ul>
           </div>
           <div class="p-3 border rounded-lg bg-card">
             <h4 class="font-bold text-primary mb-1">Gráficos Analíticos</h4>
             <ul class="text-sm list-disc pl-4 space-y-1">
               <li><strong>Volume por Categoria:</strong> Identifique as áreas com mais problemas.</li>
               <li><strong>Desempenho Semanal:</strong> Acompanhe a tendência de aberturas vs encerramentos.</li>
             </ul>
           </div>
         </div>
         <p class="text-sm"><em>Dica:</em> Use o botão de exportar no topo do Dashboard para gerar um resumo executivo dos dados atuais.</p>
       </div>
     `
   },
   chamados: {
     title: "Gestão de Chamados (Tickets)",
     content: `
       <div class="space-y-4">
         <p>A central onde as solicitações são processadas. O sistema utiliza um fluxo de trabalho otimizado.</p>
         <h4 class="font-bold mt-4">Fluxo de Trabalho (Kanban):</h4>
         <ol class="list-decimal pl-5 space-y-2 text-sm">
           <li><strong>Novo:</strong> Chamado recém-aberto pelo usuário.</li>
           <li><strong>Triagem:</strong> O administrador ou técnico assume o chamado ou o delega a outro responsável.</li>
           <li><strong>Em Execução:</strong> O técnico trabalha na solução. Comentários podem ser trocados com o usuário.</li>
           <li><strong>Pendente:</strong> Aguardando retorno do usuário ou de um fornecedor externo.</li>
           <li><strong>Encerrado:</strong> Problema resolvido. O usuário recebe uma notificação para conferência.</li>
         </ol>
         <p class="bg-amber-50 dark:bg-amber-950/20 p-3 rounded border border-amber-200 dark:border-amber-800 text-xs">
           <strong>Importante:</strong> Sempre anexe evidências (fotos, prints de erro) para agilizar o diagnóstico técnico.
         </p>
       </div>
     `
   },
   usuarios: {
     title: "Gerenciamento de Usuários",
     content: `
       <div class="space-y-4">
         <p>Controle quem acessa o sistema e qual o seu escopo de atuação.</p>
         <ul class="list-disc pl-5 space-y-2 text-sm">
           <li><strong>Criação:</strong> Ao cadastrar, defina o e-mail (login) e o departamento.</li>
           <li><strong>Associação de Perfil:</strong> Escolha entre Usuário, Técnico, Administrador ou Master.</li>
           <li><strong>Redefinição de Senha:</strong> Administradores podem forçar a troca de senha de qualquer usuário por segurança.</li>
           <li><strong>Inativação:</strong> Em vez de excluir, inative o usuário para preservar o histórico de chamados vinculados a ele.</li>
         </ul>
       </div>
     `
   },
   permissoes: {
     title: "Níveis de Acesso (RBAC)",
     content: `
       <div class="space-y-4">
         <p>O sistema utiliza o modelo <em>Role-Based Access Control</em>, garantindo que cada usuário veja apenas o que é necessário para sua função.</p>
         <div class="border rounded-lg overflow-hidden">
           <table class="w-full text-xs">
             <thead class="bg-muted">
               <tr>
                 <th class="p-2 text-left">Função</th>
                 <th class="p-2 text-left">Capacidades Principais</th>
               </tr>
             </thead>
             <tbody class="divide-y">
               <tr>
                 <td class="p-2 font-bold">Master</td>
                 <td class="p-2">Acesso total, configurações de sistema, auditoria global.</td>
               </tr>
               <tr>
                 <td class="p-2 font-bold">Admin</td>
                 <td class="p-2">Gestão de usuários, departamentos e relatórios operacionais.</td>
               </tr>
               <tr>
                 <td class="p-2 font-bold">Técnico</td>
                 <td class="p-2">Visualização e resolução de chamados, acesso a relatórios técnicos.</td>
               </tr>
               <tr>
                 <td class="p-2 font-bold">Usuário</td>
                 <td class="p-2">Abertura de chamados e acompanhamento de seus próprios pedidos.</td>
               </tr>
             </tbody>
           </table>
         </div>
       </div>
     `
   },
   relatorios: {
     title: "Relatórios e BI",
     content: `
       <div class="space-y-4">
         <p>Extraia inteligência dos dados acumulados para melhorar a eficiência da equipe.</p>
         <ul class="list-disc pl-5 space-y-2 text-sm">
           <li><strong>Desempenho por Técnico:</strong> Veja quem está resolvendo mais chamados e em menos tempo.</li>
           <li><strong>Carga por Departamento:</strong> Identifique setores que demandam mais suporte.</li>
           <li><strong>Tipologia de Erros:</strong> Analise as categorias de chamados mais frequentes para focar em treinamentos ou trocas de equipamentos.</li>
         </ul>
         <p class="text-xs italic">Formatos suportados: PDF (para visualização rápida) e Excel (para manipulação de dados em planilhas).</p>
       </div>
     `
   },
   departamentos: {
     title: "Estrutura de Departamentos",
     content: `
       <div class="space-y-4">
         <p>Configure a hierarquia da organização para direcionamento automático de chamados.</p>
         <p class="text-sm">Cada departamento pode ter seu próprio fluxo e catálogo de serviços específicos. Ao cadastrar um departamento, você facilita a filtragem nos relatórios e a organização da fila de atendimento.</p>
       </div>
     `
   },
   configuracoes: {
     title: "Configurações Globais",
     content: `
       <div class="space-y-4">
         <p>Ajustes críticos que definem o comportamento e a aparência da plataforma.</p>
         <div class="space-y-3">
           <div class="p-2 border-l-4 border-primary bg-muted/50">
             <h5 class="font-bold text-xs">Layout e Branding</h5>
             <p class="text-[11px]">Personalize logos, cores e o nome da sua empresa no sistema.</p>
           </div>
           <div class="p-2 border-l-4 border-red-500 bg-muted/50">
             <h5 class="font-bold text-xs">Segurança</h5>
             <p class="text-[11px]">Configure complexidade de senhas, expiração de sessão e bloqueio de tentativas de login.</p>
           </div>
           <div class="p-2 border-l-4 border-green-500 bg-muted/50">
             <h5 class="font-bold text-xs">Comunicação (SMTP)</h5>
             <p class="text-[11px]">Configure as credenciais de e-mail para que o sistema envie notificações automáticas de chamados.</p>
           </div>
         </div>
       </div>
     `
   },
   audit: {
     title: "Logs de Auditoria",
     content: `
       <div class="space-y-4">
         <p>Transparência total. Cada clique e alteração é registrado com data, hora, IP e usuário responsável.</p>
         <p class="text-sm">Utilize a busca avançada para encontrar ações específicas, como exclusão de chamados ou alteração de permissões, garantindo a integridade dos dados.</p>
       </div>
     `
   },
   ajuda: {
     title: "Centro de Ajuda",
     content: `
       <div class="space-y-4">
         <p>Acesso rápido à documentação oficial do sistema. O conteúdo desta página é adaptado dinamicamente com base nas permissões concedidas ao seu perfil.</p>
       </div>
     `
   }
 };

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
   
   // Note: RLS already handles filtering by role.
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
                         <div 
                           className="prose prose-slate dark:prose-invert max-w-none 
                                     prose-headings:font-bold prose-headings:tracking-tight
                                     prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-primary
                                     prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                                     prose-p:text-muted-foreground prose-p:leading-relaxed
                                     prose-li:text-muted-foreground prose-strong:text-foreground
                                     prose-hr:my-8"
                           dangerouslySetInnerHTML={{ __html: manual.content }}
                         />
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