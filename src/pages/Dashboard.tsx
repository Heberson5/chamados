 import { useEffect, useState, useMemo } from "react";
 import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
  import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Ticket, AlertCircle, CheckCircle2, Clock, Users, Filter, Calendar as CalendarIcon, Loader2, User as UserIcon, Play, Pause, History, LayoutGrid } from "lucide-react";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { format, subDays, startOfDay, endOfDay, isWithinInterval, subWeeks, subMonths, subYears, eachDayOfInterval, isSameDay, eachHourOfInterval, isSameHour } from "date-fns";
  import { ptBR } from "date-fns/locale";
  import { getPriorityLabel } from "@/lib/utils/priority";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 
 export default function Dashboard() {
   const navigate = useNavigate();
   const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [kanbanConfig, setKanbanConfig] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    period: "7d",
    technician: "all",
    user: "all",
    dateRange: { from: subDays(new Date(), 7), to: new Date() }
  });
 
     const [stats, setStats] = useState({
       totalTickets: 0,
       openTickets: 0,
       resolvedTickets: 0,
       slaViolations: 0,
       activeUsers: 0,
       avgAcceptanceTime: 0,
       avgCompletionTime: 0,
       totalPausedTime: 0,
       totalWaitingTime: 0,
       byPriority: [] as any[],
        byStatus: [] as any[],
        byStatusType: [] as any[],
        byCategory: [] as any[],
        byUser: [] as any[]
     });
 
   useEffect(() => {
     const checkRole = async () => {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
       const { data: profile } = await supabase.from("profiles").select("regra, is_master").eq("id", user.id).single();
       if (profile && profile.regra !== 'ADMIN' && profile.regra !== 'MASTER' && !profile.is_master) {
         navigate("/chamados");
       }
     };
     checkRole();
   }, [navigate]);
 
  const fetchData = async () => {
    try {
      const [ticketsRes, profilesRes, settingsRes] = await Promise.all([
        supabase.from("chamados").select("*").order('gerado_em', { ascending: false }),
        supabase.from("profiles").select("*").eq('ativo', true),
        supabase.from("system_settings").select("*").eq('key', 'kanban_config').single()
      ]);

      if (ticketsRes.data) setTickets(ticketsRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (settingsRes.data) setKanbanConfig(settingsRes.data.value as any[]);

      const activeUsersCount = profilesRes.data?.length || 0;
      setStats(prev => ({ ...prev, activeUsers: activeUsersCount }));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };
 
    useEffect(() => {
      fetchData();
      
      const channel = supabase
        .channel('dashboard-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chamados'
          },
          () => {
            fetchData();
          }
        )
        .subscribe();
 
      return () => {
        supabase.removeChannel(channel);
      };
    }, []);
 
   const filteredTickets = useMemo(() => {
     let result = [...tickets];
 
     // Period Filter
     let startDate = filters.dateRange.from;
     let endDate = filters.dateRange.to;
 
     if (filters.period !== "custom") {
       endDate = new Date();
       if (filters.period === "1d") startDate = startOfDay(new Date());
       else if (filters.period === "7d") startDate = subDays(new Date(), 7);
       else if (filters.period === "30d") startDate = subDays(new Date(), 30);
       else if (filters.period === "1y") startDate = subDays(new Date(), 365);
     }
 
    result = result.filter(t => {
      const date = new Date(t.gerado_em);
      const withinInterval = isWithinInterval(date, { start: startOfDay(startDate), end: endOfDay(endDate) });
      const technicianMatch = filters.technician === "all" || t.tecnico_id === filters.technician;
      const userMatch = filters.user === "all" || t.usuario_id === filters.user;
      
      return withinInterval && technicianMatch && userMatch;
    });

    return result;
  }, [tickets, filters, kanbanConfig]);
 
  useEffect(() => {
    const total = filteredTickets.length;
    
    // Simplify open/resolved logic - based on 'ENCERRADO' status
    const open = filteredTickets.filter(t => t.status !== 'ENCERRADO').length;
    const resolved = filteredTickets.filter(t => t.status === 'ENCERRADO').length;
    const sla = filteredTickets.filter(t => t.sla_violado).length;
  
         // By Priority
         const priorityCounts = filteredTickets.reduce((acc: any, t) => {
           const label = getPriorityLabel(t.prioridade);
           acc[label] = (acc[label] || 0) + 1;
           return acc;
         }, {});
         const byPriority = Object.keys(priorityCounts).map(name => ({ name, value: priorityCounts[name] }));
  
        // By Status (using titles from config)
        const statusCounts = filteredTickets.reduce((acc: any, t) => {
          const statusDef = kanbanConfig.find(c => c.id === t.status);
          const label = statusDef ? statusDef.title : t.status;
          acc[label] = (acc[label] || 0) + 1;
          return acc;
        }, {});
        const byStatus = Object.keys(statusCounts).map(s => ({ name: s, value: statusCounts[s] }));

        // Calculate averages
        let acceptanceTimes: number[] = [];
        let completionTimes: number[] = [];
        let totalPaused = 0;
        let totalWaiting = 0;
  
        filteredTickets.forEach(t => {
          if (t.atendido_em && t.gerado_em) {
            const diff = (new Date(t.atendido_em).getTime() - new Date(t.gerado_em).getTime()) / (1000 * 60);
            if (diff > 0) acceptanceTimes.push(diff);
          }
          // Completion time = total elapsed from ticket open to closure (encerrado - gerado), in minutes.
          if (t.encerrado_em && t.gerado_em && t.status === 'ENCERRADO') {
            const diff = (new Date(t.encerrado_em).getTime() - new Date(t.gerado_em).getTime()) / (1000 * 60);
            if (diff > 0) completionTimes.push(diff);
          }
          totalPaused += (t.tempo_total_pausado || 0);
          totalWaiting += (t.tempo_total_aguardando_usuario || 0);
        });
  
        const avgAcceptance = acceptanceTimes.length > 0 ? acceptanceTimes.reduce((a, b) => a + b, 0) / acceptanceTimes.length : 0;
        const avgCompletion = completionTimes.length > 0 ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length : 0;

        // By User (count of tickets each user opened)
        const userCounts = filteredTickets.reduce((acc: any, t) => {
          const profile = profiles.find(p => p.id === t.usuario_id);
          const name = profile ? `${profile.nome ?? ''} ${profile.sobrenome ?? ''}`.trim() || profile.email : 'Desconhecido';
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {});
        const byUser = Object.keys(userCounts)
          .map(name => ({ name, value: userCounts[name] }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);
    
        setStats(prev => ({
          ...prev,
          totalTickets: total,
          openTickets: open,
          resolvedTickets: resolved,
          slaViolations: sla,
          avgAcceptanceTime: Math.round(avgAcceptance),
          avgCompletionTime: Math.round(avgCompletion),
          totalPausedTime: Math.round(totalPaused / 60),
          totalWaitingTime: Math.round(totalWaiting / 60),
          byPriority,
           byStatus,
           byUser,
        }));
    }, [filteredTickets, profiles, kanbanConfig]);
 
    const chartData = useMemo(() => {
      let startDate = filters.dateRange.from;
      let endDate = filters.dateRange.to;
  
      if (filters.period !== "custom") {
        endDate = new Date();
        if (filters.period === "1d") startDate = startOfDay(new Date());
        else if (filters.period === "7d") startDate = subDays(new Date(), 7);
        else if (filters.period === "30d") startDate = subDays(new Date(), 30);
        else if (filters.period === "1y") startDate = subDays(new Date(), 365);
      }

      if (filters.period === "1d") {
        const hours = eachHourOfInterval({ start: startOfDay(new Date()), end: endOfDay(new Date()) });
        return hours.map(hour => {
          const hourTickets = filteredTickets.filter(t => isSameHour(new Date(t.gerado_em), hour));
          return {
            name: format(hour, "HH:mm"),
            chamados: hourTickets.length,
            sla: hourTickets.filter(t => !t.sla_violado).length
          };
        });
      }
  
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      return days.map(day => {
        const dayTickets = filteredTickets.filter(t => isSameDay(new Date(t.gerado_em), day));
        return {
          name: format(day, "dd/MM"),
          chamados: dayTickets.length,
          sla: dayTickets.filter(t => !t.sla_violado).length
        };
      });
    }, [filteredTickets, filters]);

     const cards = [
       { title: "Total de Chamados", value: stats.totalTickets, icon: Ticket, color: "text-blue-600" },
       { title: "Chamados Abertos", value: stats.openTickets, icon: Clock, color: "text-orange-600" },
       { title: "Tempo Médio Aceite", value: `${stats.avgAcceptanceTime} min`, icon: Play, color: "text-amber-600" },
       { title: "Tempo Médio Conclusão", value: `${stats.avgCompletionTime} min`, icon: CheckCircle2, color: "text-green-600" },
       { title: "Tempo Total Pausado", value: `${stats.totalPausedTime} min`, icon: Pause, color: "text-slate-600" },
       { title: "Aguardando Usuário", value: `${stats.totalWaitingTime} min`, icon: History, color: "text-indigo-600" },
     ];

   return (
     <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
           <h1 className="text-3xl font-bold tracking-tight">Painel Analítico</h1>
           <p className="text-muted-foreground">Monitoramento em tempo real do suporte e infraestrutura.</p>
         </div>
         {loading && <Loader2 className="animate-spin text-primary" />}
       </div>
 
       <Card className="p-4 bg-muted/30 border-none shadow-none">
         <div className="flex flex-wrap items-end gap-4">
           <div className="space-y-2">
             <label className="text-xs font-medium flex items-center gap-1"><Filter size={12} /> Período</label>
             <Select value={filters.period} onValueChange={(v) => setFilters({ ...filters, period: v })}>
               <SelectTrigger className="w-[180px] h-9 bg-background">
                 <SelectValue placeholder="Selecione o período" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="1d">Hoje</SelectItem>
                 <SelectItem value="7d">Últimos 7 dias</SelectItem>
                 <SelectItem value="30d">Últimos 30 dias</SelectItem>
                 <SelectItem value="1y">Este Ano</SelectItem>
                 <SelectItem value="custom">Personalizado</SelectItem>
               </SelectContent>
             </Select>
           </div>
 
           {filters.period === "custom" && (
             <>
               <div className="space-y-2">
                 <label className="text-xs font-medium">De</label>
                 <Input 
                   type="date" 
                   className="h-9 w-40" 
                   value={format(filters.dateRange.from, "yyyy-MM-dd")} 
                   onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, from: new Date(e.target.value) } })}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-medium">Até</label>
                 <Input 
                   type="date" 
                   className="h-9 w-40" 
                   value={format(filters.dateRange.to, "yyyy-MM-dd")} 
                   onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, to: new Date(e.target.value) } })}
                 />
               </div>
             </>
           )}
 
           <div className="space-y-2">
             <label className="text-xs font-medium flex items-center gap-1"><UserIcon size={12} /> Técnico</label>
             <Select value={filters.technician} onValueChange={(v) => setFilters({ ...filters, technician: v })}>
               <SelectTrigger className="w-[200px] h-9 bg-background">
                 <SelectValue placeholder="Todos os técnicos" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todos os técnicos</SelectItem>
                 {profiles.filter(p => p.regra !== 'USUARIO').map(p => (
                   <SelectItem key={p.id} value={p.id}>{p.nome} {p.sobrenome}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1"><Users size={12} /> Usuário</label>
            <Select value={filters.user} onValueChange={(v) => setFilters({ ...filters, user: v })}>
              <SelectTrigger className="w-[200px] h-9 bg-background">
                <SelectValue placeholder="Todos os usuários" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome} {p.sobrenome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          <Button variant="ghost" className="h-9 text-xs" onClick={() => {
            setFilters({
              period: "7d",
              technician: "all",
              user: "all",
              dateRange: { from: subDays(new Date(), 7), to: new Date() }
            });
          }}>Limpar Filtros</Button>
         </div>
       </Card>
       
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
         {cards.map((card) => (
           <Card key={card.title} className="hover:shadow-md transition-shadow">
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-xs font-medium text-muted-foreground">
                 {card.title}
               </CardTitle>
               <card.icon className={`h-4 w-4 ${card.color}`} />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{card.value}</div>
             </CardContent>
           </Card>
         ))}
       </div>
 
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

           <Card>
             <CardHeader>
               <CardTitle>Tempos Médios (min)</CardTitle>
               <CardDescription>Eficiência operacional em minutos</CardDescription>
             </CardHeader>
             <CardContent className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={[
                   { name: 'Aceite', valor: stats.avgAcceptanceTime },
                   { name: 'Conclusão', valor: stats.avgCompletionTime },
                   { name: 'Pausa', valor: stats.totalPausedTime },
                   { name: 'Espera', valor: stats.totalWaitingTime }
                 ]}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                   <XAxis dataKey="name" fontSize={12} stroke="currentColor" />
                   <YAxis fontSize={12} stroke="currentColor" />
                   <Tooltip 
                     contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                     itemStyle={{ color: 'hsl(var(--foreground))' }}
                   />
                    <Bar 
                      dataKey="valor" 
                      fill="hsl(var(--primary))" 
                      radius={[6, 6, 0, 0]} 
                      className="transition-all duration-300 hover:opacity-80"
                    />
                 </BarChart>
               </ResponsiveContainer>
             </CardContent>
           </Card>
 
           <Card>
             <CardHeader>
               <CardTitle>Chamados por Status</CardTitle>
               <CardDescription>Distribuição atual de chamados</CardDescription>
             </CardHeader>
             <CardContent className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={stats.byStatus}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                   >
                      {stats.byStatus.map((entry, index) => {
                        const colors = [
                          'hsl(var(--primary))',
                          'hsl(var(--chart-1, 217 91% 60%))',
                          'hsl(var(--chart-2, 142 71% 45%))',
                          'hsl(var(--chart-3, 31 97% 55%))',
                          'hsl(var(--chart-4, 262 83% 58%))',
                        ];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} className="stroke-background hover:opacity-80 transition-opacity" strokeWidth={2} />;
                      })}
                   </Pie>
                   <Tooltip 
                     contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                     itemStyle={{ color: 'hsl(var(--foreground))' }}
                   />
                   <Legend />
                 </PieChart>
               </ResponsiveContainer>
             </CardContent>
           </Card>
 
           <Card>
             <CardHeader>
               <CardTitle>Volume de Chamados</CardTitle>
               <CardDescription>Quantidade de atendimentos no período</CardDescription>
             </CardHeader>
             <CardContent className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorChamados" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSLA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2, 142 71% 45%))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-2, 142 71% 45%))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="name" stroke="currentColor" fontSize={12} />
                    <YAxis stroke="currentColor" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area type="monotone" dataKey="chamados" name="Chamados" stroke="hsl(var(--primary))" fill="url(#colorChamados)" fillOpacity={1} strokeWidth={3} />
                    <Area type="monotone" dataKey="sla" name="Dentro do SLA" stroke="hsl(var(--chart-2, 142 71% 45%))" fill="url(#colorSLA)" fillOpacity={1} strokeWidth={3} />
                  </AreaChart>
               </ResponsiveContainer>
             </CardContent>
           </Card>
  
           <Card>
             <CardHeader>
               <CardTitle>Conformidade de SLA</CardTitle>
               <CardDescription>Chamados atendidos dentro do prazo</CardDescription>
             </CardHeader>
             <CardContent className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                   <XAxis dataKey="name" stroke="currentColor" fontSize={12} />
                   <YAxis stroke="currentColor" fontSize={12} />
                   <Tooltip 
                     contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                     itemStyle={{ color: 'hsl(var(--foreground))' }}
                   />
                   <Legend verticalAlign="top" height={36}/>
                   <Line name="No Prazo" type="monotone" dataKey="sla" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                   <Line name="Total" type="monotone" dataKey="chamados" stroke="hsl(var(--primary))" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                 </LineChart>
               </ResponsiveContainer>
             </CardContent>
           </Card>
 
           <Card>
             <CardHeader>
               <CardTitle>Distribuição por Prioridade</CardTitle>
               <CardDescription>Volume de chamados por nível crítico</CardDescription>
             </CardHeader>
             <CardContent className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={stats.byPriority} layout="vertical">
                   <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--muted))" />
                   <XAxis type="number" stroke="currentColor" fontSize={12} />
                   <YAxis dataKey="name" type="category" stroke="currentColor" fontSize={12} />
                   <Tooltip 
                     contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                     itemStyle={{ color: 'hsl(var(--foreground))' }}
                   />
                   <Bar dataKey="value" name="Quantidade" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             </CardContent>
           </Card>
         </div>
 
       <Card className="bg-primary/5 border-primary/20">
         <CardHeader>
           <CardTitle>Resumo Operacional</CardTitle>
         </CardHeader>
         <CardContent>
           <p className="text-muted-foreground">
             O sistema Help-Me está monitorando {filteredTickets.length} chamados no período selecionado.
             A conformidade atual de SLA é de {stats.totalTickets > 0 ? ((stats.totalTickets - stats.slaViolations) / stats.totalTickets * 100).toFixed(1) : 0}%.
           </p>
         </CardContent>
       </Card>
     </div>
   );
 }