import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MessageSquareText, Pencil, Plus, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Resposta = Tables<"respostas_prontas">;

/** Modelos de resposta usados pela equipe no painel do chamado (atalho "/"). */
export default function CannedResponsesSettings() {
  const { toast } = useToast();
  const [items, setItems] = useState<Resposta[]>([]);
  const [draft, setDraft] = useState<Partial<Resposta> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("respostas_prontas").select("*").order("titulo");
    setItems(data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!draft?.titulo?.trim() || !draft.conteudo?.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      titulo: draft.titulo.trim(),
      atalho: draft.atalho?.trim().replace(/^\//, "") || null,
      conteudo: draft.conteudo.trim(),
      ativo: draft.ativo ?? true,
    };
    const { error } = draft.id
      ? await supabase.from("respostas_prontas").update(payload).eq("id", draft.id)
      : await supabase.from("respostas_prontas").insert({ ...payload, criado_por: user?.id ?? null });
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
      return;
    }
    setDraft(null);
    load();
  };

  const remove = async (r: Resposta) => {
    if (!confirm(`Remover "${r.titulo}"?`)) return;
    await supabase.from("respostas_prontas").delete().eq("id", r.id);
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" />
            <CardTitle>Respostas prontas</CardTitle>
          </div>
          <CardDescription className="mt-1">No painel do chamado, a equipe digita "/" ou clica no ícone de mensagem para inserir.</CardDescription>
        </div>
        <Button onClick={() => setDraft({ ativo: true })}>
          <Plus size={16} /> Nova resposta
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma resposta pronta cadastrada.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {items.map((r) => (
              <li key={r.id} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {r.titulo} {r.atalho && <span className="font-normal text-muted-foreground">/{r.atalho}</span>}
                    {!r.ativo && <span className="ml-1 text-xs font-normal text-muted-foreground">(inativa)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.conteudo}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDraft(r)} title="Editar">
                  <Pencil size={15} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(r)} title="Remover">
                  <Trash2 size={15} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar resposta pronta" : "Nova resposta pronta"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                <div className="space-y-1.5">
                  <Label>Título</Label>
                  <Input value={draft.titulo ?? ""} onChange={(e) => setDraft({ ...draft, titulo: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Atalho (opcional)</Label>
                  <Input placeholder="reiniciar" value={draft.atalho ?? ""} onChange={(e) => setDraft({ ...draft, atalho: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Texto</Label>
                <Textarea rows={6} value={draft.conteudo ?? ""} onChange={(e) => setDraft({ ...draft, conteudo: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={draft.ativo ?? true} onCheckedChange={(v) => setDraft({ ...draft, ativo: v })} /> Ativa
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving || !draft?.titulo?.trim() || !draft?.conteudo?.trim()}>
              {saving && <Loader2 size={16} className="animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
