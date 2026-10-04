import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRightLeft,
  CircleDot,
  FolderOpen,
  Loader2,
  Lock,
  MessageSquareText,
  Plus,
  Signal,
  Sparkles,
  Star,
  Timer,
  UserRound,
} from "lucide-react";
import { timeAgo, type CategoryField } from "@/lib/tickets";
import type { TicketEvent } from "@/hooks/useTicketEvents";
import type { Tables } from "@/integrations/supabase/types";

/* ------------------------------------------------------------------ */
/* Histórico de eventos                                                */
/* ------------------------------------------------------------------ */


const EVENT_META: Record<string, { icon: React.ElementType; text: (e: TicketEvent) => string }> = {
  criado: { icon: Sparkles, text: () => "abriu o chamado" },
  status: { icon: CircleDot, text: (e) => `mudou o status${e.de ? ` de ${e.de}` : ""} para ${e.para ?? "—"}` },
  responsavel: {
    icon: UserRound,
    text: (e) => (e.para ? `atribuiu a ${e.para}${e.de ? ` (antes: ${e.de})` : ""}` : `removeu o responsável${e.de ? ` (${e.de})` : ""}`),
  },
  prioridade: { icon: Signal, text: (e) => `mudou a prioridade${e.de ? ` de ${e.de}` : ""} para ${e.para ?? "—"}` },
  categoria: { icon: FolderOpen, text: (e) => `mudou a categoria${e.de ? ` de ${e.de}` : ""} para ${e.para ?? "nenhuma"}` },
  sensivel: { icon: Lock, text: (e) => (e.para === "sim" ? "marcou como dado sensível" : "removeu a marcação de dado sensível") },
  sla_vencido: { icon: Timer, text: () => "SLA venceu — responsável e administradores foram avisados" },
  auto_encerrado: { icon: ArrowRightLeft, text: (e) => `encerrado automaticamente (${e.para ?? "sem retorno"})` },
};

export function EventLine({ event, actorName }: { event: TicketEvent; actorName?: string }) {
  const meta = EVENT_META[event.tipo] ?? { icon: CircleDot, text: () => event.tipo };
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-2.5 pl-1.5 text-xs text-muted-foreground">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border bg-card">
        <Icon size={11} />
      </span>
      <span className="min-w-0">
        <span className="font-semibold text-foreground/80">{actorName || "Sistema"}</span> {meta.text(event)}
      </span>
      <span className="ml-auto shrink-0" title={new Date(event.criado_em).toLocaleString("pt-BR")}>
        {timeAgo(event.criado_em)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Favorito                                                            */
/* ------------------------------------------------------------------ */

export function FavoriteButton({ ticketId, userId, className }: { ticketId: string; userId: string | null; className?: string }) {
  const [fav, setFav] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("chamado_favoritos")
      .select("chamado_id")
      .eq("chamado_id", ticketId)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => setFav(!!data));
  }, [ticketId, userId]);

  const toggle = async () => {
    if (!userId) return;
    setBusy(true);
    if (fav) {
      await supabase.from("chamado_favoritos").delete().eq("chamado_id", ticketId).eq("user_id", userId);
    } else {
      await supabase.from("chamado_favoritos").insert({ chamado_id: ticketId, user_id: userId });
    }
    setFav(!fav);
    setBusy(false);
    window.dispatchEvent(new Event("chamados:favoritos-alterados"));
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)}
      onClick={toggle}
      disabled={busy}
      aria-pressed={fav}
      title={fav ? "Remover dos favoritos" : "Favoritar"}
    >
      <Star size={16} className={fav ? "fill-amber-400 text-amber-400" : ""} />
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* Avaliação do atendimento                                            */
/* ------------------------------------------------------------------ */

export function RatingCard({
  ticketId,
  canRate,
  tecnicoId,
}: {
  ticketId: string;
  canRate: boolean;
  tecnicoId: string | null;
}) {
  const { toast } = useToast();
  const [rating, setRating] = useState<Tables<"chamado_avaliacoes"> | null | undefined>(undefined);
  const [hover, setHover] = useState(0);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("chamado_avaliacoes")
      .select("*")
      .eq("chamado_id", ticketId)
      .maybeSingle()
      .then(({ data }) => setRating(data ?? null));
  }, [ticketId]);

  if (rating === undefined) return null;

  if (rating) {
    return (
      <div className="rounded-xl border bg-card p-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Avaliação do atendimento</span>
          <Stars value={rating.nota} />
        </div>
        {rating.comentario && <p className="mt-1 text-muted-foreground whitespace-pre-wrap">"{rating.comentario}"</p>}
      </div>
    );
  }

  if (!canRate) return null;

  const submit = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from("chamado_avaliacoes")
      .insert({ chamado_id: ticketId, nota, comentario: comentario.trim() || null, tecnico_id: tecnicoId })
      .select()
      .single();
    setBusy(false);
    if (error) {
      toast({ variant: "destructive", title: "Não foi possível enviar", description: error.message });
      return;
    }
    setRating(data);
    toast({ title: "Obrigado pela avaliação!" });
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-accent/50 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold">Como foi o atendimento?</p>
        <p className="text-xs text-muted-foreground">Sua avaliação ajuda a equipe a melhorar.</p>
      </div>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => setNota(n)}
            className="p-0.5"
          >
            <Star size={26} className={cn("transition-colors", (hover || nota) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>
      {nota > 0 && (
        <>
          <Textarea rows={2} placeholder="Quer comentar algo? (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} />
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy && <Loader2 size={14} className="animate-spin" />} Enviar avaliação
          </Button>
        </>
      )}
    </div>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Respostas prontas                                                   */
/* ------------------------------------------------------------------ */

type Canned = Tables<"respostas_prontas">;

export function CannedResponsesButton({
  onPick,
  currentText,
  open,
  onOpenChange,
  filter,
}: {
  onPick: (text: string) => void;
  currentText: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter?: string;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<Canned[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    if (!open) return;
    supabase
      .from("respostas_prontas")
      .select("*")
      .eq("ativo", true)
      .order("titulo")
      .then(({ data }) => setItems(data ?? []));
    setQuery(filter ?? "");
  }, [open, filter]);

  const q = query.trim().toLowerCase();
  const visible = items.filter((i) => !q || `${i.titulo} ${i.atalho ?? ""} ${i.conteudo}`.toLowerCase().includes(q));

  const saveCurrent = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !currentText.trim() || !newTitle.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("respostas_prontas")
      .insert({ titulo: newTitle.trim(), conteudo: currentText.trim(), criado_por: user.id })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Não foi possível salvar", description: error.message });
      return;
    }
    setItems((prev) => [...prev, data].sort((a, b) => a.titulo.localeCompare(b.titulo)));
    setNewTitle("");
    toast({ title: "Resposta pronta salva" });
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
          title="Respostas prontas (ou digite / no início)"
        >
          <MessageSquareText size={18} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-[340px] p-0">
        <div className="p-2 border-b">
          <Input autoFocus placeholder="Buscar resposta pronta…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-8" />
        </div>
        <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
          {visible.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">Nenhuma resposta pronta{q ? " encontrada" : " cadastrada"}.</p>
          ) : (
            visible.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => {
                  onPick(i.conteudo);
                  onOpenChange(false);
                }}
                className="w-full rounded-lg px-2.5 py-2 text-left hover:bg-muted"
              >
                <span className="block text-sm font-medium">
                  {i.titulo} {i.atalho && <span className="text-xs text-muted-foreground">/{i.atalho}</span>}
                </span>
                <span className="block text-xs text-muted-foreground line-clamp-2">{i.conteudo}</span>
              </button>
            ))
          )}
        </div>
        {currentText.trim().length > 10 && (
          <div className="border-t p-2 flex gap-2">
            <Input placeholder="Título para salvar o texto atual" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="h-8 text-xs" />
            <Button size="sm" variant="outline" className="h-8" onClick={saveCurrent} disabled={saving || !newTitle.trim()}>
              <Plus size={14} /> Salvar
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/* Campos próprios da categoria                                        */
/* ------------------------------------------------------------------ */


export function CategoryFieldsForm({
  fields,
  values,
  onChange,
}: {
  fields: CategoryField[];
  values: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  if (fields.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 rounded-lg border bg-muted/30 p-3">
      {fields.map((f) => (
        <div key={f.id} className="space-y-1.5">
          <Label className="text-xs">
            {f.label} {f.obrigatorio && <span className="text-destructive">*</span>}
          </Label>
          {f.tipo === "lista" ? (
            <Select value={values[f.id] ?? ""} onValueChange={(v) => onChange({ ...values, [f.id]: v })}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(f.opcoes ?? []).map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              className="h-9"
              type={f.tipo === "numero" ? "number" : f.tipo === "data" ? "date" : "text"}
              required={f.obrigatorio}
              value={values[f.id] ?? ""}
              onChange={(e) => onChange({ ...values, [f.id]: e.target.value })}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/** Exibição (somente leitura) dos campos preenchidos no chamado. */
export function CategoryFieldsView({ fields, values }: { fields: CategoryField[]; values: Record<string, unknown> | null | undefined }) {
  if (!values || Object.keys(values).length === 0) return null;
  const labelOf = (id: string) => fields.find((f) => f.id === id)?.label ?? id;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
      {Object.entries(values).map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{labelOf(k)}</dt>
          <dd className="text-right font-medium break-words">{String(v ?? "—")}</dd>
        </div>
      ))}
    </dl>
  );
}
