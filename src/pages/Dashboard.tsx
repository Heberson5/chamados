import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    const fetchTickets = async () => {
      const { data } = await supabase.from("chamados").select("*");
      if (data) setTickets(data);
    };
    fetchTickets();
  }, []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Painel de Chamados</h1>
        <Button>Novo Chamado</Button>
      </div>

      <div className="bg-white rounded-md border">
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
                <TableCell>{ticket.descricao}</TableCell>
                <TableCell>
                  <Badge variant={ticket.status === 'ABERTO' ? 'default' : 'secondary'}>
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell>{ticket.prioridade}</TableCell>
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