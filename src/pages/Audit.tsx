 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Input } from "@/components/ui/input";
import { Search, History, MousePointer2, User as UserIcon, RefreshCw } from "lucide-react";
  import { format, addHours } from "date-fns";
  import { usePermissions } from "@/hooks/usePermissions";
  import { useNavigate } from "react-router-dom";
 import { ptBR } from "date-fns/locale";
 
  export default function Audit() {
    const navigate = useNavigate();
    const { hasPermission, loading: permsLoading } = usePermissions();

    useEffect(() => {
      if (!permsLoading && !hasPermission("audit")) {
        navigate("/dashboard");
      }
    }, [permsLoading, hasPermission, navigate]);

   const [logs, setLogs] = useState<any[]>([]);
   const [searchTerm, setSearchTerm] = useState("");
   const [isLoading, setIsLoading] = useState(true);
 
    const fetchLogs = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("audit_logs")
        .select(`
          *,
          profiles!audit_logs_user_id_fkey (
            nome,
            sobrenome,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching logs:", error);
      }
      if (data) setLogs(data);
      setIsLoading(false);
    };

    useEffect(() => {
      fetchLogs();
    }, []);
 
    const filteredLogs = logs.filter(log => {
      const userName = log.profiles 
        ? `${log.profiles.nome} ${log.profiles.sobrenome}` 
        : (log.user_email || "Sistema");
      
      const search = searchTerm.toLowerCase();
      return userName.toLowerCase().includes(search) ||
             (log.action?.toLowerCase() || "").includes(search) ||
             (log.table_name?.toLowerCase() || "").includes(search);
    });

    const translateAction = (action: string) => {
      const translations: Record<string, string> = {
        'INSERT': 'CRIAR',
        'UPDATE': 'EDITAR',
        'DELETE': 'EXCLUIR',
        'LOGIN': 'LOGIN',
        'LOGOUT': 'LOGOUT',
        'VIEW': 'VISUALIZAR'
      };
      return translations[action] || action;
    };

    // Cuiabá is UTC-4. Since JS dates are usually UTC, we adjust.
    // Note: Better to use a timezone library like date-fns-tz, but for simplicity:
    const formatCuiabaTime = (date: string) => {
      const d = new Date(date);
      // Cuiabá is -4
      return format(addHours(d, 0), "dd/MM/yy HH:mm:ss", { locale: ptBR });
    };
 
   return (
     <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
       <div>
         <h1 className="text-3xl font-bold tracking-tight">Auditoria do Sistema</h1>
         <p className="text-muted-foreground">Monitore as ações e a navegação de todos os usuários cadastrados.</p>
       </div>
 
        <div className="flex items-center justify-between gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchLogs} 
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
         <div className="relative flex-1 max-w-md">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
           <Input 
             placeholder="Buscar por e-mail, ação ou tabela..." 
             className="pl-10"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
         </div>
       </div>
 
       <Card>
         <CardHeader>
           <CardTitle className="text-lg flex items-center gap-2">
             <History className="w-5 h-5 text-primary" />
             Logs de Atividade
           </CardTitle>
         </CardHeader>
         <CardContent>
           <Table>
             <TableHeader>
               <TableRow>
                  <TableHead>Usuário / E-mail</TableHead>
                 <TableHead>Ação</TableHead>
                 <TableHead>Local / Tabela</TableHead>
                 <TableHead>ID Registro</TableHead>
                 <TableHead>Data/Hora</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {filteredLogs.map((log) => (
                 <TableRow key={log.id}>
                     <TableCell className="font-medium text-xs">
                       <div className="flex items-center gap-2">
                         <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden border shrink-0">
                           {log.profiles?.avatar_url ? (
                             <img src={log.profiles.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                           ) : (
                             <UserIcon size={12} />
                           )}
                         </div>
                         <div className="flex flex-col">
                         <span>{log.profiles ? `${log.profiles.nome} ${log.profiles.sobrenome}` : (log.user_email || 'Sistema')}</span>
                           <span className="text-[10px] text-muted-foreground">{log.user_email}</span>
                         </div>
                       </div>
                     </TableCell>
                   <TableCell>
                     <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                       log.action === 'INSERT' ? 'bg-green-100 text-green-700' :
                       log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                       log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                       'bg-slate-100 text-slate-700'
                     }`}>
                        {translateAction(log.action)}
                     </span>
                   </TableCell>
                   <TableCell className="text-xs">
                     {log.path ? (
                       <div className="flex items-center gap-1">
                         <MousePointer2 size={10} />
                         {log.path}
                       </div>
                     ) : (
                       log.table_name || "-"
                     )}
                   </TableCell>
                   <TableCell className="text-[10px] font-mono text-muted-foreground">{log.record_id || "-"}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatCuiabaTime(log.created_at)}
                    </TableCell>
                 </TableRow>
               ))}
               {filteredLogs.length === 0 && !isLoading && (
                 <TableRow>
                   <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                     Nenhum log encontrado.
                   </TableCell>
                 </TableRow>
               )}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
     </div>
   );
 }