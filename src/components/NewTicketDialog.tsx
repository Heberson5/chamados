import { useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const schema = z.object({
  subject: z.string().trim().min(3, "Assunto muito curto").max(200),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  category: z.string().trim().max(60).optional(),
});

export const NewTicketDialog = ({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
}) => {
  const { user, org } = useAuth();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = schema.safeParse({ subject, description, priority, category: category || undefined });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!user || !org) return;
    setBusy(true);
    const { error } = await supabase.from("tickets").insert({
      subject: parsed.data.subject,
      description: parsed.data.description ?? null,
      priority: parsed.data.priority,
      category: parsed.data.category ?? null,
      organization_id: org.id,
      requester_id: user.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Chamado criado");
    setSubject(""); setDescription(""); setPriority("medium"); setCategory("");
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo chamado</DialogTitle>
          <DialogDescription>Descreva o problema ou solicitação.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subject">Assunto</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex.: Erro ao acessar relatório" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhe o que está acontecendo..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Categoria</Label>
              <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Suporte, Financeiro..." />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Criando..." : "Criar chamado"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};