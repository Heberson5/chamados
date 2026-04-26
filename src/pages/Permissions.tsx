 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Shield, User, Hammer, Crown } from "lucide-react";
 
 export default function Permissions() {
   const roles = [
     {
       title: "Master",
       icon: Crown,
       description: "Acesso total ao sistema, todas as configurações e gerenciamento de administradores.",
       color: "text-purple-500",
       bg: "bg-purple-500/10",
       permissions: ["Acesso Total", "Gerenciar Administradores", "Configurações do Sistema", "Todos os Relatórios"]
     },
     {
       title: "Administrador",
       icon: Shield,
       description: "Gerencia usuários, chamados e relatórios. Não tem acesso às configurações críticas do sistema.",
       color: "text-blue-500",
       bg: "bg-blue-500/10",
       permissions: ["Gerenciar Usuários", "Gerenciar Chamados", "Ver Relatórios", "Gerenciar Categorias"]
     },
     {
       title: "Técnico",
       icon: Hammer,
       description: "Responsável por atender e encerrar chamados atribuídos ou disponíveis.",
       color: "text-amber-500",
       bg: "bg-amber-500/10",
       permissions: ["Atender Chamados", "Encerrar Chamados", "Ver Seus Relatórios", "Adicionar Comentários"]
     },
     {
       title: "Usuário",
       icon: User,
       description: "Pode abrir chamados e acompanhar o progresso dos seus próprios pedidos.",
       color: "text-slate-500",
       bg: "bg-slate-500/10",
       permissions: ["Abrir Chamados", "Ver Seus Chamados", "Comentar Seus Chamados", "Avaliar Atendimento"]
     }
   ];
 
   return (
     <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in">
       <div>
         <h1 className="text-3xl font-bold tracking-tight">Permissões</h1>
         <p className="text-muted-foreground">Visualize os níveis de acesso e permissões de cada tipo de usuário.</p>
       </div>
 
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {roles.map((role) => (
           <Card key={role.title} className="flex flex-col h-full border-2 hover:border-primary/20 transition-all">
             <CardHeader className="text-center pb-2">
               <div className={`mx-auto w-12 h-12 rounded-full ${role.bg} flex items-center justify-center mb-2`}>
                 <role.icon className={`w-6 h-6 ${role.color}`} />
               </div>
               <CardTitle className={role.color}>{role.title}</CardTitle>
               <CardDescription className="text-xs min-h-[40px]">{role.description}</CardDescription>
             </CardHeader>
             <CardContent className="flex-1">
               <div className="space-y-2 mt-4">
                 <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Permissões Incluídas:</h4>
                 <ul className="space-y-1">
                   {role.permissions.map((perm) => (
                     <li key={perm} className="text-xs flex items-center gap-2">
                       <div className={`w-1 h-1 rounded-full ${role.color}`} />
                       {perm}
                     </li>
                   ))}
                 </ul>
               </div>
             </CardContent>
           </Card>
         ))}
       </div>
     </div>
   );
 }