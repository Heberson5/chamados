import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

export default function Chamados() {
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    const fetchTickets = async () => {
      const { data } = await supabase.from("chamados").select("*").order("gerado_em", { ascending: false });
      if (data) setTickets(data);
    };
    fetchTickets();
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Chamados</h1>
          <p className="text-muted-foreground">Visualize e gerencie todos os atendimentos técnicos.</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus size={18} />
          Novo Chamado
        </Button>
      </div>

      <div className="bg-card rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OS</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium">{ticket.os}</TableCell>
                <TableCell className="max-w-md truncate">{ticket.descricao}</TableCell>
                <TableCell>
                  <Badge variant={ticket.status === 'ABERTO' ? 'default' : 'secondary'}>
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    ticket.prioridade === 'P1' ? 'border-red-500 text-red-500' :
                    ticket.prioridade === 'P2' ? 'border-orange-500 text-orange-500' :
                    'border-gray-500'
                  }>
                    {ticket.prioridade}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(ticket.gerado_em).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  Nenhum chamado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
