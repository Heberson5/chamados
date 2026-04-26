 import { useEffect, useState, useMemo } from "react";
 import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
 import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
 import { Ticket, AlertCircle, CheckCircle2, Clock, Users, Filter, Calendar as CalendarIcon, Loader2, User as UserIcon } from "lucide-react";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { format, subDays, startOfDay, endOfDay, isWithinInterval, subWeeks, subMonths, subYears, eachDayOfInterval, isSameDay } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
 import { Button } from "@/components/ui/button";
 import { Calendar } from "@/components/ui/calendar";
 
 export default function Dashboard() {
   const navigate = useNavigate();
   const [loading, setLoading] = useState(true);
   const [tickets, setTickets] = useState<any[]>([]);
   const [profiles, setProfiles] = useState<any[]>([]);
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
     activeUsers: 0
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
       const [ticketsRes, profilesRes] = await Promise.all([
         supabase.from("chamados").select("*").order('gerado_em', { ascending: false }),
         supabase.from("profiles").select("*").eq('ativo', true)
       ]);
 
       if (ticketsRes.data) setTickets(ticketsRes.data);
       if (profilesRes.data) setProfiles(profilesRes.data);
 
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
     const interval = setInterval(fetchData, 30000);
     return () => clearInterval(interval);
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
   }, [tickets, filters]);
 
   useEffect(() => {
     const total = filteredTickets.length;
     const open = filteredTickets.filter(t => t.status === 'ABERTO').length;
     const resolved = filteredTickets.filter(t => t.status === 'ENCERRADO').length;
     const sla = filteredTickets.filter(t => t.sla_violado).length;
 
     setStats(prev => ({
       ...prev,
       totalTickets: total,
       openTickets: open,
       resolvedTickets: resolved,
       slaViolations: sla
     }));
   }, [filteredTickets]);
 
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
    { title: "Resolvidos", value: stats.resolvedTickets, icon: CheckCircle2, color: "text-green-600" },
    { title: "Violações de SLA", value: stats.slaViolations, icon: AlertCircle, color: "text-red-600" },
    { title: "Usuários Ativos", value: stats.activeUsers, icon: Users, color: "text-indigo-600" },
  ];

   const chartData = [
     { name: 'Seg', chamados: 12, sla: 10 },
     { name: 'Ter', chamados: 19, sla: 15 },
     { name: 'Qua', chamados: 15, sla: 14 },
     { name: 'Qui', chamados: 22, sla: 20 },
     { name: 'Sex', chamados: 30, sla: 25 },
     { name: 'Sáb', chamados: 8, sla: 8 },
     { name: 'Dom', chamados: 5, sla: 5 },
   ];
 
   return (
     <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
       <div>
         <h1 className="text-3xl font-bold tracking-tight">Painel Analítico</h1>
         <p className="text-muted-foreground">Monitoramento em tempo real do suporte e infraestrutura.</p>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {cards.map((card) => (
           <Card key={card.title} className="hover:shadow-md transition-shadow">
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium text-muted-foreground">
                 {card.title}
               </CardTitle>
               <card.icon className={`h-4 w-4 ${card.color}`} />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{card.value}</div>
               <p className="text-xs text-muted-foreground mt-1">+2.5% em relação ao mês anterior</p>
             </CardContent>
           </Card>
         ))}
       </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <Card>
           <CardHeader>
             <CardTitle>Volume de Chamados</CardTitle>
             <CardDescription>Quantidade de atendimentos nos últimos 7 dias</CardDescription>
           </CardHeader>
           <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                 <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                 <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                 <Tooltip 
                   contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                   itemStyle={{ color: 'hsl(var(--primary))' }}
                 />
                 <Bar dataKey="chamados" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader>
             <CardTitle>Conformidade de SLA</CardTitle>
             <CardDescription>Taxa de atendimento dentro do prazo</CardDescription>
           </CardHeader>
           <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                 <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                 <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                 <Tooltip 
                   contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                 />
                 <Line type="monotone" dataKey="sla" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
               </LineChart>
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
             O sistema Help-Me está operando com conformidade de 85% no SLA geral. 
             A infraestrutura baseada na arquitetura microservices do repositório garante alta disponibilidade e rastreabilidade total.
           </p>
         </CardContent>
       </Card>
     </div>
   );
}