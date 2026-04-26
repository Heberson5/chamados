 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Input } from "@/components/ui/input";
 import { Search, History, MousePointer2 } from "lucide-react";
import { format, addHours } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
 export default function Audit() {
   const [logs, setLogs] = useState<any[]>([]);
   const [searchTerm, setSearchTerm] = useState("");
   const [isLoading, setIsLoading] = useState(true);
 
    useEffect(() => {
      const fetchLogs = async () => {
        const { data, error } = await supabase
          .from("audit_logs")
          .select(`
            *,
            profiles!audit_logs_user_id_fkey (
              nome,
              sobrenome
            )
          `)
          .order("created_at", { ascending: false });
        
        if (data) setLogs(data);
        setIsLoading(false);
      };
      fetchLogs();
    }, []);
 
    const filteredLogs = logs.filter(log => {
      const userName = log.profiles ? `${log.profiles.nome} ${log.profiles.sobrenome}` : log.user_email;
      return userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             log.table_name?.toLowerCase().includes(searchTerm.toLowerCase());
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
 
       <div className="flex items-center gap-4">
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
                      <div className="flex flex-col">
                        <span>{log.profiles ? `${log.profiles.nome} ${log.profiles.sobrenome}` : '-'}</span>
                        <span className="text-[10px] text-muted-foreground">{log.user_email}</span>
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