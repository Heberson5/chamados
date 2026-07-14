import { useEffect, useState, useMemo, useCallback } from "react";
 import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Ticket, CheckCircle2, Clock, Users, Filter, Loader2, User as UserIcon, Play, Pause, History } from "lucide-react";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { format, subDays, startOfDay, endOfDay, isWithinInterval, subWeeks, subMonths, subYears, eachDayOfInterval, isSameDay, eachHourOfInterval, isSameHour } from "date-fns";
  import { ptBR } from "date-fns/locale";
  import { getPriorityLabel } from "@/lib/utils/priority";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
import { usePermissions } from "@/hooks/usePermissions";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import FlexibleChart from "@/components/FlexibleChart";
import ChartSettingsButton from "@/components/ChartSettingsButton";
import { useChartSettings } from "@/hooks/useChartSettings";
import type { ChartType } from "@/lib/chartSettings";
 
  function formatMinutes(min: number): string {
    if (!min || min <= 0) return "0 min";
    if (min < 60) return `${Math.round(min)} min`;
    const hours = Math.floor(min / 60);
    const mins = Math.round(min % 60);
    if (hours < 24) return mins ? `${hours}h ${mins}min` : `${hours}h`;
    const days = Math.floor(hours / 24);
    const restH = hours % 24;
    return restH ? `${days}d ${restH}h` : `${days}d`;
  }

 export default function Dashboard() {
   const navigate = useNavigate();
  const onlineUsers = useOnlineUsers();
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
 
    const { hasPermission, loading: permsLoading } = usePermissions();

    useEffect(() => {
      if (!permsLoading && !hasPermission("dashboard")) {
        navigate("/chamados");
      }
    }, [permsLoading, hasPermission, navigate]);
 
  const { getSetting, updateSetting } = useChartSettings();
  const ALL_TYPES: ChartType[] = ["pizza", "rosca", "barras", "linha", "area"];
  const MULTI_SERIES_TYPES: ChartType[] = ["barras", "linha", "area"];

  const fetchData = async () => {
    try {
      const [ticketsRes, profilesRes, statusesRes] = await Promise.all([
        supabase.from("chamados").select("*, prioridade_obj:prioridade_id(id, nome, cor, ordem)").order('gerado_em', { ascending: false }),
        supabase.from("profiles").select("*").eq('ativo', true),
        supabase.from("chamado_statuses").select("*").eq("ativo", true).order("ordem", { ascending: true })
      ]);

      if (ticketsRes.data) setTickets(ticketsRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (statusesRes.data) setKanbanConfig(statusesRes.data);

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
        else if (filters.period === "yesterday") {
          startDate = startOfDay(subDays(new Date(), 1));
          endDate = endOfDay(subDays(new Date(), 1));
        }
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
           const label = t.prioridade_obj?.nome || getPriorityLabel(t.prioridade);
           acc[label] = (acc[label] || 0) + 1;
           return acc;
         }, {});
         const byPriority = Object.keys(priorityCounts).map(name => ({ name, value: priorityCounts[name] }));
  
        // By Status (using titles from config)
        const statusCounts = filteredTickets.reduce((acc: any, t) => {
          const statusDef = kanbanConfig.find(c => c.legacy_enum === t.status || c.key === t.status);
          const label = statusDef ? statusDef.label : t.status;
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
          // Completion time = effective working time (encerrado - atendido) - pauses - waiting, in minutes.
          if (t.encerrado_em && t.status === 'ENCERRADO') {
            const start = t.atendido_em ? new Date(t.atendido_em) : new Date(t.gerado_em || t.atendido_em);
            const totalElapsed = (new Date(t.encerrado_em).getTime() - start.getTime()) / (1000 * 60);
            // convert pauses (stored in seconds) to minutes
            const pauses = ((t.tempo_total_pausado || 0) + (t.tempo_total_aguardando_usuario || 0)) / 60;
            const netTime = totalElapsed - pauses;
            
            // Use net time if positive, otherwise fall back to total elapsed if that's positive
            if (netTime > 0) {
              completionTimes.push(netTime);
            } else if (totalElapsed > 0) {
              completionTimes.push(totalElapsed);
            }
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
        else if (filters.period === "yesterday") {
          startDate = startOfDay(subDays(new Date(), 1));
          endDate = endOfDay(subDays(new Date(), 1));
        }
        else if (filters.period === "7d") startDate = subDays(new Date(), 7);
        else if (filters.period === "30d") startDate = subDays(new Date(), 30);
        else if (filters.period === "1y") startDate = subDays(new Date(), 365);
      }

      if (filters.period === "1d" || filters.period === "yesterday") {
        const baseDate = filters.period === "1d" ? new Date() : subDays(new Date(), 1);
        const hours = eachHourOfInterval({ start: startOfDay(baseDate), end: endOfDay(baseDate) });
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

    // Tendência diária dos 3 tempos operacionais: espera (aberto → aceito),
    // atendimento (tempo líquido trabalhado, sem pausas/espera do usuário) e
    // conclusão (ciclo completo: aberto → encerrado). Agrupado pela data de
    // abertura do chamado, para ficar no mesmo eixo dos demais gráficos.
    const timeSeriesData = useMemo(() => {
      const avg = (arr: number[]) => (arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

      const computeBucketMetrics = (bucketTickets: any[]) => {
        const espera: number[] = [];
        const atendimento: number[] = [];
        const conclusao: number[] = [];

        bucketTickets.forEach((t) => {
          if (t.atendido_em && t.gerado_em) {
            const diff = (new Date(t.atendido_em).getTime() - new Date(t.gerado_em).getTime()) / (1000 * 60);
            if (diff > 0) espera.push(diff);
          }
          if (t.encerrado_em && t.status === 'ENCERRADO') {
            const start = t.atendido_em ? new Date(t.atendido_em) : new Date(t.gerado_em);
            const totalElapsed = (new Date(t.encerrado_em).getTime() - start.getTime()) / (1000 * 60);
            const pauses = ((t.tempo_total_pausado || 0) + (t.tempo_total_aguardando_usuario || 0)) / 60;
            const net = totalElapsed - pauses;
            atendimento.push(net > 0 ? net : Math.max(totalElapsed, 0));

            const totalLifecycle = (new Date(t.encerrado_em).getTime() - new Date(t.gerado_em).getTime()) / (1000 * 60);
            if (totalLifecycle > 0) conclusao.push(totalLifecycle);
          }
        });

        return { espera: avg(espera), atendimento: avg(atendimento), conclusao: avg(conclusao) };
      };

      let startDate = filters.dateRange.from;
      let endDate = filters.dateRange.to;

      if (filters.period !== "custom") {
        endDate = new Date();
        if (filters.period === "1d") startDate = startOfDay(new Date());
        else if (filters.period === "yesterday") {
          startDate = startOfDay(subDays(new Date(), 1));
          endDate = endOfDay(subDays(new Date(), 1));
        }
        else if (filters.period === "7d") startDate = subDays(new Date(), 7);
        else if (filters.period === "30d") startDate = subDays(new Date(), 30);
        else if (filters.period === "1y") startDate = subDays(new Date(), 365);
      }

      if (filters.period === "1d" || filters.period === "yesterday") {
        const baseDate = filters.period === "1d" ? new Date() : subDays(new Date(), 1);
        const hours = eachHourOfInterval({ start: startOfDay(baseDate), end: endOfDay(baseDate) });
        return hours.map(hour => {
          const bucketTickets = filteredTickets.filter(t => isSameHour(new Date(t.gerado_em), hour));
          return { name: format(hour, "HH:mm"), ...computeBucketMetrics(bucketTickets) };
        });
      }

      const days = eachDayOfInterval({ start: startDate, end: endDate });
      return days.map(day => {
        const bucketTickets = filteredTickets.filter(t => isSameDay(new Date(t.gerado_em), day));
        return { name: format(day, "dd/MM"), ...computeBucketMetrics(bucketTickets) };
      });
    }, [filteredTickets, filters]);

     const cards = [
       { title: "Total de Chamados", value: stats.totalTickets, icon: Ticket, color: "text-blue-600" },
       { title: "Chamados Abertos", value: stats.openTickets, icon: Clock, color: "text-orange-600" },
       { title: "Tempo Médio Aceite", value: formatMinutes(stats.avgAcceptanceTime), icon: Play, color: "text-amber-600" },
       { title: "Tempo Médio Conclusão", value: formatMinutes(stats.avgCompletionTime), icon: CheckCircle2, color: "text-green-600" },
       { title: "Tempo Total Pausado", value: formatMinutes(stats.totalPausedTime), icon: Pause, color: "text-slate-600" },
       { title: "Aguardando Usuário", value: formatMinutes(stats.totalWaitingTime), icon: History, color: "text-indigo-600" },
       { title: "Usuários Online", value: `${onlineUsers.size}/${profiles.length}`, icon: Users, color: "text-emerald-600" },
     ];

   if (loading) {
     return (
       <div className="flex h-full min-h-[60vh] w-full items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }

   return (
     <div className="p-4 md:p-8 w-full space-y-8 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
           <h1 className="text-3xl font-bold tracking-tight">Painel Analítico</h1>
           <p className="text-muted-foreground">Monitoramento em tempo real do suporte e infraestrutura.</p>
         </div>
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
                <SelectItem value="yesterday">Ontem</SelectItem>
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
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const [y, m, d] = e.target.value.split("-").map(Number);
                      const next = new Date(y, m - 1, d);
                      const to = filters.dateRange.to < next ? next : filters.dateRange.to;
                      setFilters({ ...filters, dateRange: { from: next, to } });
                    }}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-medium">Até</label>
                 <Input 
                   type="date" 
                   className="h-9 w-40" 
                    min={format(filters.dateRange.from, "yyyy-MM-dd")}
                   value={format(filters.dateRange.to, "yyyy-MM-dd")} 
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const [y, m, d] = e.target.value.split("-").map(Number);
                      const next = new Date(y, m - 1, d);
                      setFilters({ ...filters, dateRange: { ...filters.dateRange, to: next } });
                    }}
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
       
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-6">
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

           <Card className="hover:shadow-lg transition-shadow duration-300">
             <CardHeader className="flex flex-row items-start justify-between space-y-0">
               <div>
                 <CardTitle>Tempos Médios (min)</CardTitle>
                 <CardDescription>Eficiência operacional em minutos</CardDescription>
               </div>
               <ChartSettingsButton
                 value={getSetting("dashboard_tempos_medios", { type: "barras", color: "#1d2025", legend: "automatica" })}
                 allowedTypes={ALL_TYPES}
                 onChange={(patch) => updateSetting("dashboard_tempos_medios", patch)}
               />
             </CardHeader>
             <CardContent className="h-[300px]">
               <FlexibleChart
                 {...getSetting("dashboard_tempos_medios", { type: "barras", color: "#1d2025", legend: "automatica" })}
                 data={[
                   { name: 'Aceite', valor: stats.avgAcceptanceTime },
                   { name: 'Conclusão', valor: stats.avgCompletionTime },
                   { name: 'Pausa', valor: stats.totalPausedTime },
                   { name: 'Espera', valor: stats.totalWaitingTime }
                 ]}
                 xKey="name"
                 series={[{ dataKey: "valor", name: "Minutos" }]}
                 valueFormatter={formatMinutes}
               />
             </CardContent>
           </Card>

           <Card className="hover:shadow-lg transition-shadow duration-300">
             <CardHeader className="flex flex-row items-start justify-between space-y-0">
               <div>
                 <CardTitle>Chamados por Status</CardTitle>
                 <CardDescription>Distribuição atual de chamados</CardDescription>
               </div>
               <ChartSettingsButton
                 value={getSetting("dashboard_por_status", { type: "rosca", color: "#1d2025", legend: "automatica" })}
                 allowedTypes={ALL_TYPES}
                 onChange={(patch) => updateSetting("dashboard_por_status", patch)}
               />
             </CardHeader>
             <CardContent className="h-[300px]">
               <FlexibleChart
                 {...getSetting("dashboard_por_status", { type: "rosca", color: "#1d2025", legend: "automatica" })}
                 data={stats.byStatus}
                 xKey="name"
                 series={[{ dataKey: "value", name: "Total" }]}
               />
             </CardContent>
           </Card>

           <Card className="hover:shadow-lg transition-shadow duration-300">
             <CardHeader className="flex flex-row items-start justify-between space-y-0">
               <div>
                 <CardTitle>Volume de Chamados</CardTitle>
                 <CardDescription>Quantidade de atendimentos no período</CardDescription>
               </div>
               <ChartSettingsButton
                 value={getSetting("dashboard_volume", { type: "area", color: "#1d2025", legend: "automatica" })}
                 allowedTypes={MULTI_SERIES_TYPES}
                 onChange={(patch) => updateSetting("dashboard_volume", patch)}
               />
             </CardHeader>
             <CardContent className="h-[300px]">
               <FlexibleChart
                 {...getSetting("dashboard_volume", { type: "area", color: "#1d2025", legend: "automatica" })}
                 data={chartData}
                 xKey="name"
                 series={[{ dataKey: "chamados", name: "Chamados" }, { dataKey: "sla", name: "Dentro do SLA" }]}
               />
             </CardContent>
           </Card>
  
           <Card className="hover:shadow-lg transition-shadow duration-300">
             <CardHeader className="flex flex-row items-start justify-between space-y-0">
               <div>
                 <CardTitle>Conformidade de SLA</CardTitle>
                 <CardDescription>Chamados atendidos dentro do prazo</CardDescription>
               </div>
               <ChartSettingsButton
                 value={getSetting("dashboard_sla", { type: "linha", color: "#10b981", legend: "automatica" })}
                 allowedTypes={MULTI_SERIES_TYPES}
                 onChange={(patch) => updateSetting("dashboard_sla", patch)}
               />
             </CardHeader>
             <CardContent className="h-[300px]">
               <FlexibleChart
                 {...getSetting("dashboard_sla", { type: "linha", color: "#10b981", legend: "automatica" })}
                 data={chartData}
                 xKey="name"
                 series={[{ dataKey: "sla", name: "No Prazo" }, { dataKey: "chamados", name: "Total" }]}
               />
             </CardContent>
           </Card>
 
           <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>Distribuição por Prioridade</CardTitle>
                  <CardDescription>Volume de chamados por nível crítico</CardDescription>
                </div>
                <ChartSettingsButton
                  value={getSetting("dashboard_prioridade", { type: "barras", color: "#4747eb", legend: "automatica" })}
                  allowedTypes={ALL_TYPES}
                  onChange={(patch) => updateSetting("dashboard_prioridade", patch)}
                />
              </CardHeader>
              <CardContent className="h-[300px]">
                <FlexibleChart
                  {...getSetting("dashboard_prioridade", { type: "barras", color: "#4747eb", legend: "automatica" })}
                  data={stats.byPriority}
                  xKey="name"
                  series={[{ dataKey: "value", name: "Quantidade" }]}
                />
              </CardContent>
           </Card>

           <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-300">
             <CardHeader className="flex flex-row items-start justify-between space-y-0">
               <div>
                 <CardTitle>Tempos Operacionais no Período</CardTitle>
                 <CardDescription>Média diária (minutos) de espera, atendimento e conclusão</CardDescription>
               </div>
               <ChartSettingsButton
                 value={getSetting("dashboard_tempos_operacionais", { type: "area", color: "#f59e0b", legend: "automatica" })}
                 allowedTypes={MULTI_SERIES_TYPES}
                 onChange={(patch) => updateSetting("dashboard_tempos_operacionais", patch)}
               />
             </CardHeader>
             <CardContent className="h-[320px]">
               <FlexibleChart
                 {...getSetting("dashboard_tempos_operacionais", { type: "area", color: "#f59e0b", legend: "automatica" })}
                 data={timeSeriesData}
                 xKey="name"
                 series={[
                   { dataKey: "espera", name: "Espera (aguardando início)" },
                   { dataKey: "atendimento", name: "Em Atendimento" },
                   { dataKey: "conclusao", name: "Conclusão (ciclo total)" },
                 ]}
                 valueFormatter={formatMinutes}
               />
             </CardContent>
           </Card>

            {hasPermission("dashboard:ver_chamados_por_usuario") && (
              <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle>Chamados por Usuário</CardTitle>
                    <CardDescription>Top 10 usuários com mais chamados abertos no período</CardDescription>
                  </div>
                  <ChartSettingsButton
                    value={getSetting("dashboard_por_usuario", { type: "barras", color: "#1d2025", legend: "automatica" })}
                    allowedTypes={ALL_TYPES}
                    onChange={(patch) => updateSetting("dashboard_por_usuario", patch)}
                  />
                </CardHeader>
                <CardContent
                  style={{ height: Math.max(300, Math.min(420, stats.byUser.length * 38 + 120)) }}
                >
                  {stats.byUser.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      Sem chamados no período selecionado.
                    </div>
                  ) : (
                    <FlexibleChart
                      {...getSetting("dashboard_por_usuario", { type: "barras", color: "#1d2025", legend: "automatica" })}
                      data={stats.byUser}
                      xKey="name"
                      series={[{ dataKey: "value", name: "Chamados" }]}
                      xAxisProps={{ fontSize: 10, interval: 0, angle: -45, textAnchor: "end", height: 60 }}
                    />
                  )}
                </CardContent>
              </Card>
            )}
         </div>
 
       <Card className="bg-primary/5 border-primary/20">
         <CardHeader>
           <CardTitle>Resumo Operacional</CardTitle>
         </CardHeader>
         <CardContent>
           <p className="text-muted-foreground">
             O sistema está monitorando {filteredTickets.length} chamados no período selecionado.
             A conformidade atual de SLA é de {stats.totalTickets > 0 ? ((stats.totalTickets - stats.slaViolations) / stats.totalTickets * 100).toFixed(1) : 0}%.
           </p>
         </CardContent>
       </Card>
     </div>
   );
 }