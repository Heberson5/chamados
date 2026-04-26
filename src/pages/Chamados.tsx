import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ArrowRight, AlertTriangle, Loader2, X, LayoutGrid, List } from "lucide-react";
import ChamadosKanban from "@/components/ChamadosKanban";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Chamados() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [newTicket, setNewTicket] = useState<{
    titulo: string;
    descricao: string;
    prioridade: "P1" | "P2" | "P3" | "P4" | "P5"
  }>({
    titulo: "",
    descricao: "",
    prioridade: "P3"
  });
  const { toast } = useToast();

   const fetchTickets = useCallback(async () => {
     const { data, error } = await supabase
        .from("chamados")
        .select(`
          *, 
          tecnico:profiles!chamados_tecnico_id_fkey(nome, sobrenome), 
          usuario:profiles!chamados_usuario_id_fkey(nome, sobrenome), 
          chamado_pai:chamado_pai_id(os),
          comentarios_chamado(count)
        `)
        .order("gerado_em", { ascending: false });
     
     if (error) {
       toast({ variant: "destructive", title: "Erro ao buscar chamados", description: error.message });
       return;
     }
     if (data) setTickets(data);
   }, [toast]);

   useEffect(() => {
     fetchTickets();
     
     const channel = supabase
       .channel('schema-db-changes')
       .on(
         'postgres_changes',
         {
           event: '*',
           schema: 'public',
           table: 'chamados'
         },
         () => {
           fetchTickets();
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [fetchTickets]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const invalidFiles = selectedFiles.filter(file => {
        const type = file.type;
        return type.startsWith("video/") || type.startsWith("audio/");
      });

      if (invalidFiles.length > 0) {
        toast({
          variant: "destructive",
          title: "Arquivo não permitido",
          description: "Não é permitido anexar vídeos ou áudios.",
        });
        return;
      }
      setFiles(prev => [...prev, ...selectedFiles]);
      const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Usuário não autenticado. Por favor, faça login novamente.");

      const uploadedUrls = [];
      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("chamados_anexos")
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("chamados_anexos")
          .getPublicUrl(filePath);
          
        uploadedUrls.push(publicUrl);
      }

      const { error: insertError } = await supabase.from("chamados").insert({
        titulo: newTicket.titulo || "Sem título",
        descricao: newTicket.descricao,
        prioridade: newTicket.prioridade,
        usuario_id: user.id,
        status: "ABERTO",
        anexos: uploadedUrls.length > 0 ? uploadedUrls : null
      } as any);

      if (insertError) throw insertError;

      toast({ title: "Sucesso", description: "Chamado criado com sucesso!" });
      await fetchTickets();
      setIsDialogOpen(false);
      setNewTicket({ titulo: "", descricao: "", prioridade: "P3" });
      setFiles([]);
      setPreviews([]);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao criar chamado", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const getSLAStatus = (ticket: any) => {
    if (ticket.sla_violado) return { label: "VENCIDO", color: "bg-red-500" };
    if (!ticket.sla_deadline) return { label: "N/A", color: "bg-gray-400" };
    
    const deadline = new Date(ticket.sla_deadline);
    const now = new Date();
    const diffMinutes = (deadline.getTime() - now.getTime()) / (1000 * 60);
    
    if (diffMinutes < 0) return { label: "VENCIDO", color: "bg-red-500" };
    if (diffMinutes < 30) return { label: "VENCENDO", color: "bg-yellow-500 animate-pulse" };
    return { label: "NO PRAZO", color: "bg-green-500" };
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      (t.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      t.os.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

   const getPriorityLabel = (priority: string) => {
     const labels: Record<string, string> = {
       P1: "Crítica",
       P2: "Alta",
       P3: "Média",
       P4: "Baixa",
       P5: "Muito Baixa"
     };
     return labels[priority] || priority;
   };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Chamados</h1>
          <p className="text-muted-foreground">Visualize, gerencie e vincule atendimentos técnicos.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ABERTO">Aberto</SelectItem>
              <SelectItem value="EM_ATENDIMENTO">Em Atendimento</SelectItem>
              <SelectItem value="ENCERRADO">Encerrado</SelectItem>
              <SelectItem value="CANCELADO">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus size={18} />
                Novo Chamado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Chamado</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título</Label>
                  <Input 
                    id="titulo" 
                    required 
                    value={newTicket.titulo}
                    onChange={e => setNewTicket({...newTicket, titulo: e.target.value})}
                    placeholder="Ex: Problema no servidor"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <textarea
                    id="descricao"
                    required
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                    value={newTicket.descricao}
                    onChange={e => setNewTicket({...newTicket, descricao: e.target.value})}
                    placeholder="Descreva o problema detalhadamente..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select 
                    value={newTicket.prioridade} 
                    onValueChange={v => setNewTicket({...newTicket, prioridade: v as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P1">Crítica</SelectItem>
                      <SelectItem value="P2">Alta</SelectItem>
                      <SelectItem value="P3">Média</SelectItem>
                      <SelectItem value="P4">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anexos">Anexos (Texto, PDF, Imagens)</Label>
                  <Input 
                    id="anexos" 
                    type="file"
                    multiple
                    accept=".txt,.pdf,image/*"
                    onChange={handleFileChange}
                  />
                  <p className="text-[10px] text-muted-foreground">Vídeos e áudios não são permitidos.</p>
                  
                  {previews.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {previews.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-md overflow-hidden border">
                          <img src={url} alt={`Preview ${idx}`} className="object-cover w-full h-full" />
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Chamado
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Buscar por OS ou descrição..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <List size={16} /> Lista
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2">
              <LayoutGrid size={16} /> Kanban
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list">
          <div className="bg-card rounded-md border shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chamado</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>SLA Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Responsável / Interações</TableHead>
                  <TableHead>Anexos</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => {
                  const sla = getSLAStatus(ticket);
                  return (
                    <TableRow key={ticket.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                           <span className="font-bold">{ticket.titulo || "Sem título"}</span>
                           <span className="text-[10px] text-muted-foreground font-mono leading-none">{ticket.os}</span>
                          {ticket.chamado_pai && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <ArrowRight size={10} /> {ticket.chamado_pai.os}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs md:max-w-md truncate">
                        <div className="flex flex-col">
                          <span className="truncate">{ticket.descricao}</span>
                          <span className="text-[11px] text-muted-foreground">Solicitante: {ticket.usuario?.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${sla.color}`} />
                            <span className="text-xs font-bold tracking-wider">{sla.label}</span>
                          </div>
                          {ticket.sla_deadline && (
                            <span className="text-[10px] text-muted-foreground mt-1 font-mono">
                              {format(new Date(ticket.sla_deadline), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          ticket.status === 'ABERTO' ? 'default' : 
                          ticket.status === 'EM_ATENDIMENTO' ? 'secondary' :
                          ticket.status === 'ENCERRADO' ? 'outline' : 'destructive'
                        }>
                          {ticket.status}
                        </Badge>
                      </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            ticket.prioridade === 'P1' ? 'border-destructive text-destructive bg-destructive/10' :
                            ticket.prioridade === 'P2' ? 'border-orange-500 text-orange-600 bg-orange-500/10' :
                            'border-muted-foreground'
                          }>
                            {getPriorityLabel(ticket.prioridade)}
                          </Badge>
                        </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {ticket.tecnico ? `${ticket.tecnico.nome} ${ticket.tecnico.sobrenome}` : 'Não atribuído'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {ticket.comentarios_chamado?.[0]?.count || 0} interações
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {ticket.anexos && ticket.anexos.length > 0 ? (
                          <div className="flex gap-1">
                              {ticket.anexos.map((url: string, idx: number) => (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                                  [{idx + 1}]
                                </a>
                              ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {ticket.gerado_em ? format(new Date(ticket.gerado_em), "dd/MM/yy HH:mm", { locale: ptBR }) : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredTickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                         <AlertTriangle size={32} className="text-warning" />
                        <p>Nenhum chamado encontrado para os filtros atuais.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="kanban" className="mt-0">
          <ChamadosKanban tickets={filteredTickets} onUpdate={fetchTickets} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
