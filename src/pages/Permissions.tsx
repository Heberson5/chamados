import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, User, Hammer, Crown, Plus, Pencil, Trash2, PowerOff, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
 
 export default function Permissions() {
   const roles = [
     {
       title: "Master",
       icon: Crown,
       description: "Acesso total ao sistema, todas as configurações e gerenciamento de administradores.",
       color: "text-purple-500",
       bg: "bg-purple-500/10",
        permissions: ["Acesso Total", "Gerenciar Administradores", "Configurações do Sistema", "Todos os Relatórios"],
        granular: {
          create: true,
          edit: true,
          delete: true,
          inactivate: true
        }
     },
     {
       title: "Administrador",
       icon: Shield,
       description: "Gerencia usuários, chamados e relatórios. Não tem acesso às configurações críticas do sistema.",
       color: "text-blue-500",
       bg: "bg-blue-500/10",
        permissions: ["Gerenciar Usuários", "Gerenciar Chamados", "Ver Relatórios", "Gerenciar Categorias"],
        granular: {
          create: true,
          edit: true,
          delete: true,
          inactivate: true
        }
     },
     {
       title: "Técnico",
       icon: Hammer,
       description: "Responsável por atender e encerrar chamados atribuídos ou disponíveis.",
       color: "text-amber-500",
       bg: "bg-amber-500/10",
        permissions: ["Atender Chamados", "Encerrar Chamados", "Ver Seus Relatórios", "Adicionar Comentários"],
        granular: {
          create: true,
          edit: true,
          delete: false,
          inactivate: false
        }
     },
     {
       title: "Usuário",
       icon: User,
       description: "Pode abrir chamados e acompanhar o progresso dos seus próprios pedidos.",
       color: "text-slate-500",
       bg: "bg-slate-500/10",
        permissions: ["Abrir Chamados", "Ver Seus Chamados", "Comentar Seus Chamados", "Avaliar Atendimento"],
        granular: {
          create: true,
          edit: true,
          delete: false,
          inactivate: false
        }
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
                <div className="space-y-3 mt-6 border-t pt-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ações Granulares:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={role.granular.create ? "outline" : "secondary"} className={`w-full justify-start gap-1 text-[9px] ${role.granular.create ? 'border-green-500/50 text-green-600' : 'opacity-40'}`}>
                        <Plus size={10} /> Criar
                        {role.granular.create && <CheckCircle2 size={8} className="ml-auto" />}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={role.granular.edit ? "outline" : "secondary"} className={`w-full justify-start gap-1 text-[9px] ${role.granular.edit ? 'border-blue-500/50 text-blue-600' : 'opacity-40'}`}>
                        <Pencil size={10} /> Editar
                        {role.granular.edit && <CheckCircle2 size={8} className="ml-auto" />}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={role.granular.delete ? "outline" : "secondary"} className={`w-full justify-start gap-1 text-[9px] ${role.granular.delete ? 'border-red-500/50 text-red-600' : 'opacity-40'}`}>
                        <Trash2 size={10} /> Excluir
                        {role.granular.delete && <CheckCircle2 size={8} className="ml-auto" />}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={role.granular.inactivate ? "outline" : "secondary"} className={`w-full justify-start gap-1 text-[9px] ${role.granular.inactivate ? 'border-orange-500/50 text-orange-600' : 'opacity-40'}`}>
                        <PowerOff size={10} /> Inativar
                        {role.granular.inactivate && <CheckCircle2 size={8} className="ml-auto" />}
                      </Badge>
                    </div>
                  </div>
                </div>
             </CardContent>
           </Card>
         ))}
       </div>
     </div>
   );
 }