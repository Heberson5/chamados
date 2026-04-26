import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchInventory = async () => {
      const { data } = await supabase
        .from("itens_inventario")
        .select("*, categorias(nome)");
      if (data) setItems(data);
    };
    fetchInventory();
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Inventário</h1>
          <p className="text-muted-foreground">Gerenciamento de estoque, categorias e fornecedores.</p>
        </div>
      </div>

      <div className="bg-card rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Estoque Atual</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.numero}</TableCell>
                <TableCell>{item.nome}</TableCell>
                <TableCell>{item.sku}</TableCell>
                <TableCell>{item.categorias?.nome}</TableCell>
                <TableCell>{item.estoque_atual} {item.unidade}</TableCell>
                <TableCell>
                  <Badge variant={item.estoque_atual <= item.estoque_minimo ? 'destructive' : 'secondary'}>
                    {item.estoque_atual <= item.estoque_minimo ? 'Estoque Baixo' : 'OK'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Nenhum item encontrado no inventário.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}