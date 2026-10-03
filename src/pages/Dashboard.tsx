import { useEffect, useState, useMemo, useCallback, type CSSProperties, type ReactNode } from "react";
 import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Ticket, CheckCircle2, Users, Loader2, User as UserIcon, Pause, History, Inbox, AlertCircle, Timer, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSlaInfo } from "@/lib/tickets";
import { PriorityIndicator, UserAvatar } from "@/components/tickets/TicketBits";
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
    period: "todos",
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
      const withinInterval = filters.period === "todos" || isWithinInterval(date, { start: startOfDay(startDate), end: endOfDay(endDate) });
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
          const statusDef = kanbanConfig.find(c => c.id === t.status_id) ||
            kanbanConfig.find(c => c.legacy_enum === t.status || c.key === t.status);
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
 
    // Data do chamado mais antigo — usada como início da linha do tempo
    // quando o período selecionado é "Todos os chamados".
    const earliestTicketDate = useMemo(() => {
      if (tickets.length === 0) return subDays(new Date(), 30);
      return new Date(Math.min(...tickets.map(t => new Date(t.gerado_em).getTime())));
    }, [tickets]);

    const chartData = useMemo(() => {
      let startDate = filters.dateRange.from;
      let endDate = filters.dateRange.to;

      if (filters.period !== "custom") {
        endDate = new Date();
        if (filters.period === "todos") startDate = earliestTicketDate;
        else if (filters.period === "1d") startDate = startOfDay(new Date());
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
    }, [filteredTickets, filters, earliestTicketDate]);

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
        if (filters.period === "todos") startDate = earliestTicketDate;
        else if (filters.period === "1d") startDate = startOfDay(new Date());
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
    }, [filteredTickets, filters, earliestTicketDate]);

    type TicketLike = (typeof tickets)[number];
    // Estado atual (independe do período): usado em "Precisam de atenção" e "Carga por técnico".
    const statusOf = useCallback(
      (t: TicketLike) => kanbanConfig.find(c => c.id === t.status_id) || kanbanConfig.find(c => c.legacy_enum === t.status || c.key === t.status),
      [kanbanConfig]
    );
    const isClosed = useCallback(
      (t: TicketLike) => {
        const s = statusOf(t);
        if (s) return !!(s.is_encerrado || s.is_cancelado);
        return t.status === "ENCERRADO" || t.status === "CANCELADO";
      },
      [statusOf]
    );

    const openNow = useMemo(
      () =>
        tickets.filter(t =>
          !isClosed(t) &&
          (filters.technician === "all" || t.tecnico_id === filters.technician) &&
          (filters.user === "all" || t.usuario_id === filters.user)
        ),
      [tickets, isClosed, filters.technician, filters.user]
    );

    const attention = useMemo(() => {
      const now = Date.now();
      return openNow
        .map(t => ({ t, sla: getSlaInfo(t, statusOf(t), now) }))
        .filter(x => x.sla.state === "bad" || x.sla.state === "warn")
        .sort((a, b) => a.sla.rank - b.sla.rank || new Date(a.t.sla_deadline).getTime() - new Date(b.t.sla_deadline).getTime());
    }, [openNow, statusOf]);

    const workload = useMemo(() => {
      const counts = new Map<string, number>();
      openNow.forEach(t => {
        if (t.tecnico_id) counts.set(t.tecnico_id, (counts.get(t.tecnico_id) || 0) + 1);
      });
      const rows = [...counts.entries()]
        .map(([id, value]) => ({ id, value, person: profiles.find(p => p.id === id) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
      const max = Math.max(1, ...rows.map(r => r.value));
      return { rows, max, unassigned: openNow.filter(t => !t.tecnico_id).length };
    }, [openNow, profiles]);

    const [me, setMe] = useState<{ nome?: string } | null>(null);
    useEffect(() => {
      supabase.auth.getUser().then(({ data }) => {
        const id = data.user?.id;
        if (!id) return;
        supabase.from("profiles").select("nome").eq("id", id).maybeSingle().then(({ data: p }) => setMe(p));
      });
    }, []);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
    const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

    const openInPeriod = filteredTickets.filter(t => !isClosed(t)).length;
    const slaRate = stats.totalTickets > 0 ? Math.round(((stats.totalTickets - stats.slaViolations) / stats.totalTickets) * 100) : null;
    const overdue = attention.filter(a => a.sla.state === "bad").length;

    const kpis = [
      {
        title: "Chamados abertos",
        value: String(openInPeriod),
        hint: `de ${stats.totalTickets} no período`,
        icon: Inbox,
        color: "#2563eb",
      },
      {
        title: "SLA vencido",
        value: String(overdue),
        hint: overdue > 0 ? "precisam de atenção agora" : "nenhum chamado atrasado",
        icon: AlertCircle,
        color: "#e5484d",
        tone: overdue > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
      },
      {
        title: "Tempo médio de aceite",
        value: formatMinutes(stats.avgAcceptanceTime),
        hint: `conclusão média: ${formatMinutes(stats.avgCompletionTime)}`,
        icon: Timer,
        color: "hsl(var(--primary))",
      },
      {
        title: "Resolvidos no prazo",
        value: slaRate == null ? "—" : `${slaRate}%`,
        hint: `${stats.resolvedTickets} encerrado(s) no período`,
        icon: CheckCircle2,
        color: "#12a150",
      },
    ];

    const miniStats = [
      { title: "Total no período", value: String(stats.totalTickets), icon: Ticket },
      { title: "Tempo total pausado", value: formatMinutes(stats.totalPausedTime), icon: Pause },
      { title: "Aguardando usuário", value: formatMinutes(stats.totalWaitingTime), icon: History },
      { title: "Usuários online", value: `${onlineUsers.size}/${profiles.length}`, icon: Users },
    ];

    const PERIODS = [
      { value: "1d", label: "Hoje" },
      { value: "yesterday", label: "Ontem" },
      { value: "7d", label: "7 dias" },
      { value: "30d", label: "30 dias" },
      { value: "1y", label: "Ano" },
      { value: "todos", label: "Tudo" },
      { value: "custom", label: "Personalizado" },
    ];

    const filtersActive = filters.period !== "todos" || filters.technician !== "all" || filters.user !== "all";

   if (loading) {
     return (
       <div className="flex h-full min-h-[60vh] w-full items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }

   const chartCard = (
     key: string,
     title: string,
     description: string,
     fallback: { type: ChartType; color: string; legend: "automatica" },
     allowedTypes: ChartType[],
     body: (setting: ReturnType<typeof getSetting>) => ReactNode,
     className = "",
     contentStyle?: CSSProperties
   ) => {
     const setting = getSetting(key, fallback);
     return (
       <Card className={className}>
         <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
           <div>
             <CardTitle>{title}</CardTitle>
             <CardDescription className="text-xs">{description}</CardDescription>
           </div>
           <ChartSettingsButton value={setting} allowedTypes={allowedTypes} onChange={(patch) => updateSetting(key, patch)} />
         </CardHeader>
         <CardContent className="h-[300px]" style={contentStyle}>
           {body(setting)}
         </CardContent>
       </Card>
     );
   };

   return (
     <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto space-y-5 md:space-y-6 animate-fade-in">
       <div className="flex flex-col 2xl:flex-row justify-between 2xl:items-end gap-4">
         <div className="min-w-0">
           <h1 className="text-2xl md:text-[26px] font-bold tracking-tight">
             {greeting}{me?.nome ? `, ${me.nome}` : ""} <span aria-hidden="true">👋</span>
           </h1>
           <p className="text-sm text-muted-foreground mt-1">Aqui está o resumo do suporte — {today}.</p>
         </div>

         <div className="flex flex-wrap items-center gap-2">
           <div className="flex max-w-full overflow-x-auto custom-scrollbar rounded-xl border bg-card p-1 shadow-xs">
             {PERIODS.map(p => (
               <button
                 key={p.value}
                 type="button"
                 onClick={() => setFilters({ ...filters, period: p.value })}
                 className={cn(
                   "h-7 shrink-0 rounded-lg px-3 text-xs font-semibold transition-colors",
                   filters.period === p.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                 )}
               >
                 {p.label}
               </button>
             ))}
           </div>

           <Select value={filters.technician} onValueChange={(v) => setFilters({ ...filters, technician: v })}>
             <SelectTrigger className="h-9 w-[170px] text-xs bg-card">
               <UserIcon size={14} className="mr-1 text-muted-foreground shrink-0" />
               <SelectValue placeholder="Todos os técnicos" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Todos os técnicos</SelectItem>
               {profiles.filter(p => p.regra !== 'USUARIO').map(p => (
                 <SelectItem key={p.id} value={p.id}>{p.nome} {p.sobrenome}</SelectItem>
               ))}
             </SelectContent>
           </Select>

           <Select value={filters.user} onValueChange={(v) => setFilters({ ...filters, user: v })}>
             <SelectTrigger className="h-9 w-[170px] text-xs bg-card">
               <Users size={14} className="mr-1 text-muted-foreground shrink-0" />
               <SelectValue placeholder="Todos os usuários" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Todos os usuários</SelectItem>
               {profiles.map(p => (
                 <SelectItem key={p.id} value={p.id}>{p.nome} {p.sobrenome}</SelectItem>
               ))}
             </SelectContent>
           </Select>

           {filtersActive && (
             <Button
               variant="ghost"
               size="sm"
               className="text-xs text-muted-foreground"
               onClick={() => setFilters({ period: "todos", technician: "all", user: "all", dateRange: { from: subDays(new Date(), 7), to: new Date() } })}
             >
               <X size={14} /> Limpar
             </Button>
           )}
         </div>
       </div>

       {filters.period === "custom" && (
         <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3 shadow-xs">
           <div className="space-y-1">
             <label className="text-xs font-medium text-muted-foreground">De</label>
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
           <div className="space-y-1">
             <label className="text-xs font-medium text-muted-foreground">Até</label>
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
         </div>
       )}

       <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
         {kpis.map((k) => (
           <Card key={k.title} className="p-4 md:p-5 flex flex-col gap-2">
             <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground">
               <span
                 className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                 style={{ color: k.color, backgroundColor: `color-mix(in srgb, ${k.color} 12%, transparent)` }}
               >
                 <k.icon size={15} />
               </span>
               <span className="leading-tight">{k.title}</span>
             </div>
             <div className="text-2xl md:text-[28px] font-bold tracking-tight tabular-nums">{k.value}</div>
             <div className={cn("text-xs font-medium text-muted-foreground", k.tone)}>{k.hint}</div>
           </Card>
         ))}
       </div>

       <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl border bg-card shadow-xs divide-x divide-y md:divide-y-0 overflow-hidden">
         {miniStats.map((s) => (
           <div key={s.title} className="flex items-center gap-3 px-4 py-3 min-w-0">
             <s.icon size={16} className="text-muted-foreground shrink-0" />
             <div className="min-w-0">
               <div className="text-[11px] font-medium text-muted-foreground truncate">{s.title}</div>
               <div className="text-sm font-semibold tabular-nums">{s.value}</div>
             </div>
           </div>
         ))}
       </div>

       <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 md:gap-6">
         {chartCard(
           "dashboard_volume",
           "Volume de chamados",
           "Abertos × dentro do SLA no período",
           { type: "area", color: "#5643f0", legend: "automatica" },
           MULTI_SERIES_TYPES,
           (s) => (
             <FlexibleChart
               {...s}
               data={chartData}
               xKey="name"
               series={[{ dataKey: "chamados", name: "Chamados" }, { dataKey: "sla", name: "Dentro do SLA" }]}
             />
           ),
           "",
           { height: 340 }
         )}

         <div className="flex flex-col gap-4 md:gap-6">
           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="flex items-center gap-2">
                 Precisam de atenção
                 {attention.length > 0 && (
                   <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">{attention.length}</span>
                 )}
               </CardTitle>
               <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/chamados")}>
                 Ver todos <ArrowRight size={14} />
               </Button>
             </CardHeader>
             <CardContent className="pt-0">
               {attention.length === 0 ? (
                 <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-4 text-sm text-muted-foreground">
                   <CheckCircle2 size={16} className="text-emerald-600" /> Tudo em dia — nenhum SLA vencendo.
                 </div>
               ) : (
                 <ul className="divide-y">
                   {attention.slice(0, 5).map(({ t, sla }) => (
                     <li key={t.id}>
                       <button
                         type="button"
                         onClick={() => navigate(`/chamados?id=${t.id}`)}
                         className="flex w-full items-center gap-3 py-2.5 text-left rounded-md hover:bg-muted/50 -mx-1 px-1"
                       >
                         <PriorityIndicator priority={t.prioridade_obj} legacy={t.prioridade} showLabel={false} />
                         <span className="min-w-0 flex-1">
                           <span className="block truncate text-sm font-semibold">{t.titulo}</span>
                           <span className="block truncate text-xs text-muted-foreground">
                             #{t.os} · {profiles.find(p => p.id === t.usuario_id)?.nome ?? "—"}
                           </span>
                         </span>
                         <span className={cn("sla-chip shrink-0", sla.state === "bad" ? "sla-bad" : "sla-warn")}>{sla.label}</span>
                       </button>
                     </li>
                   ))}
                 </ul>
               )}
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="pb-2">
               <CardTitle>Carga por técnico</CardTitle>
               <CardDescription className="text-xs">Chamados em aberto agora</CardDescription>
             </CardHeader>
             <CardContent className="pt-0 space-y-3">
               {workload.rows.length === 0 ? (
                 <p className="text-sm text-muted-foreground">Nenhum chamado atribuído em aberto.</p>
               ) : (
                 workload.rows.map(r => (
                   <div key={r.id} className="flex items-center gap-3">
                     <UserAvatar person={r.person} size={28} />
                     <span className="w-28 truncate text-sm font-medium">{r.person ? `${r.person.nome ?? ""} ${r.person.sobrenome ?? ""}`.trim() : "—"}</span>
                     <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                       <span className="block h-full rounded-full bg-primary" style={{ width: `${(r.value / workload.max) * 100}%` }} />
                     </span>
                     <span className="w-6 text-right text-sm font-semibold tabular-nums">{r.value}</span>
                   </div>
                 ))
               )}
               {workload.unassigned > 0 && (
                 <p className="text-xs text-muted-foreground pt-1">+ {workload.unassigned} sem responsável</p>
               )}
             </CardContent>
           </Card>
         </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
         {chartCard(
           "dashboard_tempos_medios",
           "Tempos médios",
           "Eficiência operacional",
           { type: "barras", color: "#5643f0", legend: "automatica" },
           ALL_TYPES,
           (s) => (
             <FlexibleChart
               {...s}
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
           )
         )}

         {chartCard(
           "dashboard_por_status",
           "Chamados por status",
           "Distribuição no período",
           { type: "rosca", color: "#5643f0", legend: "automatica" },
           ALL_TYPES,
           (s) => <FlexibleChart {...s} data={stats.byStatus} xKey="name" series={[{ dataKey: "value", name: "Total" }]} />
         )}

         {chartCard(
           "dashboard_sla",
           "Conformidade de SLA",
           "Chamados atendidos dentro do prazo",
           { type: "linha", color: "#10b981", legend: "automatica" },
           MULTI_SERIES_TYPES,
           (s) => (
             <FlexibleChart
               {...s}
               data={chartData}
               xKey="name"
               series={[{ dataKey: "sla", name: "No Prazo" }, { dataKey: "chamados", name: "Total" }]}
             />
           )
         )}

         {chartCard(
           "dashboard_prioridade",
           "Distribuição por prioridade",
           "Volume de chamados por nível crítico",
           { type: "barras", color: "#5643f0", legend: "automatica" },
           ALL_TYPES,
           (s) => <FlexibleChart {...s} data={stats.byPriority} xKey="name" series={[{ dataKey: "value", name: "Quantidade" }]} />
         )}

         {chartCard(
           "dashboard_tempos_operacionais",
           "Tempos operacionais no período",
           "Média diária de espera, atendimento e conclusão",
           { type: "area", color: "#f59e0b", legend: "automatica" },
           MULTI_SERIES_TYPES,
           (s) => (
             <FlexibleChart
               {...s}
               data={timeSeriesData}
               xKey="name"
               series={[
                 { dataKey: "espera", name: "Espera (aguardando início)" },
                 { dataKey: "atendimento", name: "Em Atendimento" },
                 { dataKey: "conclusao", name: "Conclusão (ciclo total)" },
               ]}
               valueFormatter={formatMinutes}
             />
           ),
           "lg:col-span-2",
           { height: 320 }
         )}

         {hasPermission("dashboard:ver_chamados_por_usuario") &&
           chartCard(
             "dashboard_por_usuario",
             "Chamados por usuário",
             "Top 10 usuários com mais chamados abertos no período",
             { type: "barras", color: "#5643f0", legend: "automatica" },
             ALL_TYPES,
             (s) =>
               stats.byUser.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                   Sem chamados no período selecionado.
                 </div>
               ) : (
                 <FlexibleChart
                   {...s}
                   data={stats.byUser}
                   xKey="name"
                   series={[{ dataKey: "value", name: "Chamados" }]}
                   xAxisProps={{ fontSize: 10, interval: 0, angle: -45, textAnchor: "end", height: 60 }}
                 />
               ),
             "lg:col-span-2",
             { height: Math.max(300, Math.min(420, stats.byUser.length * 38 + 120)) }
           )}
       </div>
     </div>
   );
 }
