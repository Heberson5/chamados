import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
 import { ArrowLeft, Send } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { PRIORITY_DOT, PRIORITY_LABEL, timeAgo } from "@/lib/ticket-meta";
 import { useKanbanSettings } from "@/hooks/useKanbanSettings";
import { toast } from "sonner";
import { z } from "zod";

type Ticket = {
  id: string; number: number; subject: string; description: string | null;
  status: string; priority: string; category: string | null;
  created_at: string; updated_at: string; resolved_at: string | null;
  requester_id: string | null;
  first_response_at: string | null;
};
type Comment = { id: string; body: string; is_internal: boolean; created_at: string; author_id: string | null };
type ProfileLite = { id: string; full_name: string | null; email: string };

const commentSchema = z.string().trim().min(1).max(5000);

 const TicketDetail = () => {
   const { getStatusLabel, getStatusColor, columns } = useKanbanSettings();
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [authors, setAuthors] = useState<Record<string, ProfileLite>>({});
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data: t } = await supabase.from("tickets").select("*").eq("id", id).maybeSingle();
    setTicket(t as Ticket | null);
    const { data: c } = await supabase
      .from("ticket_comments").select("*").eq("ticket_id", id).order("created_at", { ascending: true });
    const cList = (c as Comment[]) ?? [];
    setComments(cList);
    const ids = Array.from(new Set([...(t ? [t.requester_id] : []), ...cList.map((x) => x.author_id)].filter(Boolean) as string[]));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
      const map: Record<string, ProfileLite> = {};
      (profs ?? []).forEach((p: any) => (map[p.id] = p));
      setAuthors(map);
    }
  };

  useEffect(() => { load(); }, [id]);

  const updateField = async (patch: Partial<Ticket>) => {
    if (!ticket) return;
    if (patch.status === "resolved" && !ticket.resolved_at) {
      (patch as any).resolved_at = new Date().toISOString();
    }
    const { error } = await supabase.from("tickets").update(patch as any).eq("id", ticket.id);
    if (error) return toast.error(error.message);
    setTicket({ ...ticket, ...patch } as Ticket);
  };

  const sendComment = async () => {
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) return;
    if (!user || !ticket) return;
    setBusy(true);
    const { error } = await supabase.from("ticket_comments").insert({
      ticket_id: ticket.id, body: parsed.data, is_internal: internal, author_id: user.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (!ticket.first_response_at && ticket.requester_id !== user.id) {
      await supabase.from("tickets").update({ first_response_at: new Date().toISOString() }).eq("id", ticket.id);
    }
    setBody(""); setInternal(false);
    load();
  };

  if (!ticket) {
    return (
      <>
        <PageHeader title="Carregando..." />
        <div className="p-6 text-sm text-muted-foreground">Buscando chamado...</div>
      </>
    );
  }

  const requester = ticket.requester_id ? authors[ticket.requester_id] : null;

  return (
    <>
      <PageHeader
        title={`#${ticket.number}`}
        actions={
          <Link to="/app/tickets">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="size-4" /> Voltar
            </Button>
          </Link>
        }
      />
      <div className="grid lg:grid-cols-[1fr_300px] gap-6 p-6">
        <div className="space-y-5 min-w-0">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{ticket.subject}</h2>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span>Aberto {timeAgo(ticket.created_at)}</span>
              {requester && <span>por {requester.full_name ?? requester.email}</span>}
            </div>
          </div>

          {ticket.description && (
            <div className="rounded-xl border border-border bg-background p-4 text-sm whitespace-pre-wrap">
              {ticket.description}
            </div>
          )}

          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conversa</div>
            {comments.length === 0 && (
              <div className="text-sm text-muted-foreground">Nenhum comentário ainda.</div>
            )}
            {comments.map((c) => {
              const a = c.author_id ? authors[c.author_id] : null;
              return (
                <div key={c.id} className={`rounded-xl border p-4 ${c.is_internal ? "border-warning/40 bg-warning/5" : "border-border bg-background"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-medium">{a?.full_name ?? a?.email ?? "Sistema"}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {c.is_internal && <span className="text-warning">Nota interna</span>}
                      <span>{timeAgo(c.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{c.body}</div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-border bg-background p-4 space-y-3">
            <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escrever um comentário..." />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="internal" checked={internal} onCheckedChange={setInternal} />
                <Label htmlFor="internal" className="text-xs cursor-pointer">Nota interna</Label>
              </div>
              <Button size="sm" onClick={sendComment} disabled={busy || !body.trim()} className="gap-1.5">
                <Send className="size-3.5" /> Enviar
              </Button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-background p-4 space-y-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Status</div>
               <Select value={ticket.status} onValueChange={(v) => updateField({ status: v })}>
                 <SelectTrigger>
                   <span className="flex items-center gap-2">
                     <span className={cn("size-1.5 rounded-full", getStatusColor(ticket.status))} />
                     {getStatusLabel(ticket.status)}
                   </span>
                 </SelectTrigger>
                 <SelectContent>
                   {columns.map((col: any) => (
                     <SelectItem key={col.id} value={col.id}>{col.label}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Prioridade</div>
              <Select value={ticket.priority} onValueChange={(v) => updateField({ priority: v as any })}>
                <SelectTrigger>
                  <span className="flex items-center gap-2">
                    <span className={`size-1.5 rounded-full ${PRIORITY_DOT[ticket.priority]}`} />
                    {PRIORITY_LABEL[ticket.priority]}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {(["low","medium","high","urgent"] as const).map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Categoria</div>
              <div className="text-sm">{ticket.category ?? "—"}</div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Pessoas</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="size-6 rounded-full bg-secondary grid place-items-center text-[10px] font-medium">
                  {(requester?.full_name ?? requester?.email ?? "?")[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate">{requester?.full_name ?? requester?.email ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">Solicitante</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};

export default TicketDetail;