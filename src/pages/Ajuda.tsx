 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { usePermissions } from "@/hooks/usePermissions";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Loader2, Save, Edit3, Eye } from "lucide-react";
 import { useToast } from "@/hooks/use-toast";
 import { Textarea } from "@/components/ui/textarea";
 import { Input } from "@/components/ui/input";
 
 export default function Ajuda() {
   const { isMaster, isAdmin, loading: permsLoading } = usePermissions();
   const [manuals, setManuals] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [isEditing, setIsEditing] = useState(false);
   const [activeTab, setActiveTab] = useState("");
   const { toast } = useToast();
 
   const fetchManuals = async () => {
     setIsLoading(true);
     try {
       const { data, error } = await supabase
         .from("system_manuals")
         .select("*")
         .order("role_key");
       
       if (error) throw error;
       setManuals(data || []);
       if (data && data.length > 0) {
         setActiveTab(data[0].role_key);
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
           <TabsList className={`grid w-full grid-cols-${visibleManuals.length}`}>
             {visibleManuals.map((m) => (
               <TabsTrigger key={m.role_key} value={m.role_key}>
                 {m.role_key.charAt(0) + m.role_key.slice(1).toLowerCase()}
               </TabsTrigger>
             ))}
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
                 <CardContent className="space-y-4">
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
                     <div 
                       className="prose prose-slate dark:prose-invert max-w-none"
                       dangerouslySetInnerHTML={{ __html: manual.content }}
                     />
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