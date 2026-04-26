import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Ticket, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Package, 
  Users 
} from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    slaViolations: 0,
    inventoryItems: 0,
    activeUsers: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: total },
        { count: open },
        { count: resolved },
        { count: sla },
        { count: inventory },
        { count: users }
      ] = await Promise.all([
        supabase.from("chamados").select("*", { count: 'exact', head: true }),
        supabase.from("chamados").select("*", { count: 'exact', head: true }).eq('status', 'ABERTO'),
        supabase.from("chamados").select("*", { count: 'exact', head: true }).eq('status', 'ENCERRADO'),
        supabase.from("chamados").select("*", { count: 'exact', head: true }).eq('sla_violado', true),
        supabase.from("itens_inventario").select("*", { count: 'exact', head: true }),
        supabase.from("profiles").select("*", { count: 'exact', head: true }).eq('ativo', true)
      ]);

      setStats({
        totalTickets: total || 0,
        openTickets: open || 0,
        resolvedTickets: resolved || 0,
        slaViolations: sla || 0,
        inventoryItems: inventory || 0,
        activeUsers: users || 0
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "Total de Chamados", value: stats.totalTickets, icon: Ticket, color: "text-blue-600" },
    { title: "Chamados Abertos", value: stats.openTickets, icon: Clock, color: "text-orange-600" },
    { title: "Resolvidos", value: stats.resolvedTickets, icon: CheckCircle2, color: "text-green-600" },
    { title: "Violações de SLA", value: stats.slaViolations, icon: AlertCircle, color: "text-red-600" },
    { title: "Itens em Inventário", value: stats.inventoryItems, icon: Package, color: "text-purple-600" },
    { title: "Usuários Ativos", value: stats.activeUsers, icon: Users, color: "text-indigo-600" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Painel Analítico</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
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

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo ao Sistema Help-Me</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              O sistema foi configurado com a estrutura completa baseada no repositório fornecido.
              Utilize o menu lateral para acessar as novas funcionalidades de Inventário, Gestão de Pessoas e Financeiro.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}