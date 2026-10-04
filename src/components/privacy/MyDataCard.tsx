import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Download, Eye, FileText, Loader2, Plus, ShieldCheck } from "lucide-react";
import { RECURSO_LABEL, SOLICITACAO_STATUS, SOLICITACAO_TIPOS, downloadJson, tipoLabel } from "@/lib/lgpd";
import type { Tables } from "@/integrations/supabase/types";

type Solicitacao = Tables<"lgpd_solicitacoes">;
type Acesso = Tables<"lgpd_acessos">;

/** Direitos do titular (LGPD, art. 18) dentro de "Meu perfil". */
export default function MyDataCard({ profile }: { profile: { id: string; nome?: string | null; sobrenome?: string | null; email?: string | null } }) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [requests, setRequests] = useState<Solicitacao[]>([]);
  const [accesses, setAccesses] = useState<Acesso[]>([]);
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("acesso");
  const [descricao, setDescricao] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ texto?: string; versao?: string } | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const load = useCallback(async () => {
    const [{ data: reqs }, { data: acc }, { data: pn }] = await Promise.all([
      supabase.from("lgpd_solicitacoes").select("*").eq("titular_id", profile.id).order("criado_em", { ascending: false }),
      supabase.from("lgpd_acessos").select("*").eq("titular_id", profile.id).order("criado_em", { ascending: false }).limit(10),
      supabase.from("system_settings").select("value").eq("key", "privacy_notice").maybeSingle(),
    ]);
    setRequests(reqs ?? []);
    setAccesses(acc ?? []);
    setNotice((pn?.value as { texto?: string; versao?: string } | null) ?? null);
  }, [profile.id]);

  useEffect(() => {
    load();
  }, [load]);

  const exportData = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.rpc("lgpd_meus_dados");
      if (error) throw error;
      downloadJson(data, `meus-dados-${new Date().toISOString().slice(0, 10)}.json`);
      supabase.rpc("registrar_auditoria", { _acao: "LGPD_EXPORTACAO_PROPRIA" }).then(() => undefined, () => undefined);
    } catch (err) {
      toast({ variant: "destructive", title: "Não foi possível exportar", description: (err as Error).message });
    } finally {
      setExporting(false);
    }
  };

  const submit = async () => {
    setSending(true);
    const { error } = await supabase.from("lgpd_solicitacoes").insert({
      titular_id: profile.id,
      titular_nome: `${profile.nome ?? ""} ${profile.sobrenome ?? ""}`.trim(),
      titular_email: profile.email,
      tipo,
      descricao: descricao.trim() || null,
    });
    setSending(false);
    if (error) {
      toast({ variant: "destructive", title: "Não foi possível registrar", description: error.message });
      return;
    }
    toast({ title: "Solicitação registrada", description: "O encarregado de dados tem até 15 dias para responder." });
    setOpen(false);
    setDescricao("");
    load();
  };

  const tipoInfo = SOLICITACAO_TIPOS.find((t) => t.value === tipo);

  return (
    <Card id="privacidade">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle>Privacidade e meus dados</CardTitle>
        </div>
        <CardDescription>Seus direitos como titular de dados pessoais (LGPD, art. 18).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportData} disabled={exporting}>
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Baixar meus dados
          </Button>
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Plus size={16} /> Fazer uma solicitação
          </Button>
          {notice?.texto && (
            <Button variant="ghost" onClick={() => setNoticeOpen(true)}>
              <FileText size={16} /> Aviso de privacidade
            </Button>
          )}
        </div>

        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Minhas solicitações</h4>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma solicitação feita.</p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {requests.map((r) => {
                const st = SOLICITACAO_STATUS[r.status] ?? SOLICITACAO_STATUS.pendente;
                return (
                  <li key={r.id} className="p-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">#{r.protocolo} · {tipoLabel(r.tipo)}</span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", st.cls)}>{st.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Aberta em {new Date(r.criado_em).toLocaleDateString("pt-BR")}
                        {r.status !== "concluida" && r.status !== "recusada" && ` · prazo ${new Date(r.prazo + "T12:00:00").toLocaleDateString("pt-BR")}`}
                      </span>
                    </div>
                    {r.resposta && <p className="text-sm text-muted-foreground whitespace-pre-wrap">Resposta: {r.resposta}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Eye size={13} /> Quem acessou meus dados
          </h4>
          {accesses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum acesso de terceiros registrado.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {accesses.map((a) => (
                <li key={a.id} className="flex flex-wrap gap-x-2 text-muted-foreground">
                  <span className="font-medium text-foreground">{a.ator_email}</span>
                  <span>{RECURSO_LABEL[a.recurso] ?? a.recurso}{a.detalhe ? ` (${a.detalhe})` : ""}</span>
                  <span className="ml-auto text-xs">{new Date(a.criado_em).toLocaleString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Nova solicitação de titular</DialogTitle>
            <DialogDescription>Ela vai para o encarregado de dados, que responde em até 15 dias.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>O que você deseja?</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOLICITACAO_TIPOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tipoInfo && <p className="text-xs text-muted-foreground">{tipoInfo.hint}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lgpd-desc">Detalhes (opcional)</Label>
              <Textarea id="lgpd-desc" rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: meu telefone está errado no cadastro…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={sending}>
              {sending && <Loader2 size={16} className="animate-spin" />} Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Aviso de privacidade</DialogTitle>
            <DialogDescription>Versão {notice?.versao}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar whitespace-pre-wrap text-sm leading-relaxed">{notice?.texto}</div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
