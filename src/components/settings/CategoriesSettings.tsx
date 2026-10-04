import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FolderOpen, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { formatDuration, parseCategoryFields, type CategoryField } from "@/lib/tickets";
import type { Tables } from "@/integrations/supabase/types";

type Categoria = Tables<"chamado_categorias">;
type Draft = Partial<Categoria> & { camposList: CategoryField[] };

const COLORS = ["#5643f0", "#2563eb", "#0d9488", "#16a34a", "#ea580c", "#e11d48", "#db2777", "#64748b"];

/** Categorias de serviço: SLA, prioridade, responsável e campos próprios. */
export default function CategoriesSettings() {
  const { toast } = useToast();
  const [items, setItems] = useState<Categoria[]>([]);
  const [priorities, setPriorities] = useState<{ id: string; nome: string }[]>([]);
  const [agents, setAgents] = useState<{ id: string; nome: string | null; sobrenome: string | null }[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ data: cats }, { data: prios }, { data: ags }] = await Promise.all([
      supabase.from("chamado_categorias").select("*").order("ordem").order("nome"),
      supabase.from("chamados_prioridades").select("id, nome").order("ordem"),
      supabase.from("profiles").select("id, nome, sobrenome").eq("pode_receber_chamados", true).eq("ativo", true),
    ]);
    setItems(cats ?? []);
    setPriorities(prios ?? []);
    setAgents(ags ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!draft?.nome?.trim()) return;
    setSaving(true);
    const payload = {
      nome: draft.nome.trim(),
      descricao: draft.descricao?.trim() || null,
      cor: draft.cor || COLORS[0],
      sla_horas: draft.sla_horas ? Number(draft.sla_horas) : null,
      prioridade_padrao_id: draft.prioridade_padrao_id || null,
      tecnico_padrao_id: draft.tecnico_padrao_id || null,
      campos: draft.camposList.filter((f) => f.label.trim()).map((f) => ({
        ...f,
        label: f.label.trim(),
        opcoes: f.tipo === "lista" ? (f.opcoes ?? []).map((o) => o.trim()).filter(Boolean) : undefined,
      })),
      ativo: draft.ativo ?? true,
      ordem: draft.ordem ?? items.length,
    };
    const { error } = draft.id
      ? await supabase.from("chamado_categorias").update(payload).eq("id", draft.id)
      : await supabase.from("chamado_categorias").insert(payload);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Erro ao salvar categoria", description: error.message });
      return;
    }
    setDraft(null);
    load();
  };

  const remove = async (c: Categoria) => {
    if (!confirm(`Remover a categoria "${c.nome}"? Os chamados existentes ficam sem categoria.`)) return;
    const { error } = await supabase.from("chamado_categorias").delete().eq("id", c.id);
    if (error) toast({ variant: "destructive", title: "Erro ao remover", description: error.message });
    load();
  };

  const setField = (idx: number, patch: Partial<CategoryField>) => {
    if (!draft) return;
    const list = [...draft.camposList];
    list[idx] = { ...list[idx], ...patch };
    setDraft({ ...draft, camposList: list });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <CardTitle>Categorias de serviço</CardTitle>
          </div>
          <CardDescription className="mt-1">
            Cada categoria pode ter SLA próprio (tem prioridade sobre o da prioridade), prioridade e responsável padrão e campos extras no formulário.
          </CardDescription>
        </div>
        <Button onClick={() => setDraft({ cor: COLORS[0], ativo: true, camposList: [] })}>
          <Plus size={16} /> Nova categoria
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma categoria. Sem categorias, o formulário de chamado continua como antes.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {items.map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.cor }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {c.nome} {!c.ativo && <span className="text-xs font-normal text-muted-foreground">(inativa)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.sla_horas ? `SLA ${formatDuration(c.sla_horas * 60)}` : "SLA da prioridade"}
                    {c.tecnico_padrao_id && ` · responsável: ${agents.find((a) => a.id === c.tecnico_padrao_id)?.nome ?? "—"}`}
                    {parseCategoryFields(c.campos).length > 0 && ` · ${parseCategoryFields(c.campos).length} campo(s) extra`}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDraft({ ...c, camposList: parseCategoryFields(c.campos) })} title="Editar">
                  <Pencil size={15} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(c)} title="Remover">
                  <Trash2 size={15} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar categoria" : "Nova categoria"}</DialogTitle>
            <DialogDescription>Ex.: Impressoras, Acesso/Senha, ERP, Rede, Hardware.</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={draft.nome ?? ""} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cor</Label>
                  <div className="flex gap-1.5 pt-1.5">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="h-6 w-6 rounded-full border-2"
                        style={{ backgroundColor: c, borderColor: draft.cor === c ? "hsl(var(--foreground))" : "transparent" }}
                        onClick={() => setDraft({ ...draft, cor: c })}
                        aria-label={`Cor ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Descrição (aparece no formulário)</Label>
                <Textarea rows={2} value={draft.descricao ?? ""} onChange={(e) => setDraft({ ...draft, descricao: e.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>SLA (horas)</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Da prioridade"
                    value={draft.sla_horas ?? ""}
                    onChange={(e) => setDraft({ ...draft, sla_horas: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Prioridade padrão</Label>
                  <Select value={draft.prioridade_padrao_id ?? "none"} onValueChange={(v) => setDraft({ ...draft, prioridade_padrao_id: v === "none" ? null : v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {priorities.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Responsável padrão</Label>
                  <Select value={draft.tecnico_padrao_id ?? "none"} onValueChange={(v) => setDraft({ ...draft, tecnico_padrao_id: v === "none" ? null : v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome} {a.sobrenome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Campos extras no formulário</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDraft({ ...draft, camposList: [...draft.camposList, { id: crypto.randomUUID().slice(0, 8), label: "", tipo: "texto", obrigatorio: false }] })
                    }
                  >
                    <Plus size={14} /> Campo
                  </Button>
                </div>
                {draft.camposList.length === 0 && <p className="text-xs text-muted-foreground">Ex.: "Patrimônio do equipamento", "Sistema afetado".</p>}
                {draft.camposList.map((f, idx) => (
                  <div key={f.id} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_130px_auto_auto] items-center">
                    <Input placeholder="Nome do campo" value={f.label} onChange={(e) => setField(idx, { label: e.target.value })} className="h-9" />
                    <Select value={f.tipo} onValueChange={(v) => setField(idx, { tipo: v as CategoryField["tipo"] })}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="texto">Texto</SelectItem>
                        <SelectItem value="numero">Número</SelectItem>
                        <SelectItem value="data">Data</SelectItem>
                        <SelectItem value="lista">Lista</SelectItem>
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                      <Switch checked={!!f.obrigatorio} onCheckedChange={(v) => setField(idx, { obrigatorio: v })} /> Obrigatório
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDraft({ ...draft, camposList: draft.camposList.filter((_, i) => i !== idx) })}
                      aria-label="Remover campo"
                    >
                      <X size={15} />
                    </Button>
                    {f.tipo === "lista" && (
                      <Input
                        className="h-9 sm:col-span-4"
                        placeholder="Opções separadas por vírgula"
                        value={(f.opcoes ?? []).join(", ")}
                        onChange={(e) => setField(idx, { opcoes: e.target.value.split(",") })}
                      />
                    )}
                  </div>
                ))}
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
            <Button onClick={save} disabled={saving || !draft?.nome?.trim()}>
              {saving && <Loader2 size={16} className="animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
