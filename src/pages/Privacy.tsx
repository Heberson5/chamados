import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Clock,
  Eye,
  FileText,
  Inbox,
  Loader2,
  Lock,
  Plus,
  Play,
  Save,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { RECURSO_LABEL, SOLICITACAO_STATUS, addBusinessDays, tipoLabel } from "@/lib/lgpd";
import type { Tables } from "@/integrations/supabase/types";

type Solicitacao = Tables<"lgpd_solicitacoes">;
type Incidente = Tables<"lgpd_incidentes">;
type Acesso = Tables<"lgpd_acessos">;

type LgpdSettings = {
  retencao_auditoria_dias: number;
  retencao_acessos_dias: number;
  anonimizar_chamados_apos_dias: number;
  remover_anexos_apos_dias: number;
  exigir_mfa_admin: boolean;
};

type PrivacyNotice = {
  versao: string;
  texto: string;
  atualizado_em: string;
  encarregado_nome: string;
  encarregado_email: string;
};

const DEFAULT_SETTINGS: LgpdSettings = {
  retencao_auditoria_dias: 365,
  retencao_acessos_dias: 730,
  anonimizar_chamados_apos_dias: 1825,
  remover_anexos_apos_dias: 730,
  exigir_mfa_admin: false,
};

const SEVERIDADE: Record<string, { label: string; cls: string }> = {
  baixa: { label: "Baixa", cls: "bg-muted text-muted-foreground" },
  media: { label: "Média", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  alta: { label: "Alta", cls: "bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  critica: { label: "Crítica", cls: "bg-red-500/10 text-red-700 dark:text-red-400" },
};
const INC_STATUS: Record<string, string> = {
  aberto: "Aberto",
  em_analise: "Em análise",
  comunicado: "Comunicado",
  encerrado: "Encerrado",
};

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

export default function Privacy() {
  const { isAdmin, isMaster, loading: permsLoading } = usePermissions();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [mfaBlocked, setMfaBlocked] = useState(false);
  const [requests, setRequests] = useState<Solicitacao[]>([]);
  const [incidents, setIncidents] = useState<Incidente[]>([]);
  const [accesses, setAccesses] = useState<Acesso[]>([]);
  const [accessFilter, setAccessFilter] = useState("");
  const [settings, setSettings] = useState<LgpdSettings>(DEFAULT_SETTINGS);
  const [notice, setNotice] = useState<PrivacyNotice>({ versao: "1", texto: "", atualizado_em: "", encarregado_nome: "", encarregado_email: "" });
  const [savedNoticeText, setSavedNoticeText] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Record<string, unknown> | null>(null);
  const [answering, setAnswering] = useState<Solicitacao | null>(null);
  const [editingIncident, setEditingIncident] = useState<Partial<Incidente> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: ok } = await supabase.rpc("mfa_satisfeito");
    setMfaBlocked(ok === false);
    const [r, i, a, s, n] = await Promise.all([
      supabase.from("lgpd_solicitacoes").select("*").order("criado_em", { ascending: false }),
      supabase.from("lgpd_incidentes").select("*").order("detectado_em", { ascending: false }),
      supabase.from("lgpd_acessos").select("*").order("criado_em", { ascending: false }).limit(300),
      supabase.from("system_settings").select("value").eq("key", "lgpd_settings").maybeSingle(),
      supabase.from("system_settings").select("value").eq("key", "privacy_notice").maybeSingle(),
    ]);
    setRequests(r.data ?? []);
    setIncidents(i.data ?? []);
    setAccesses(a.data ?? []);
    setSettings({ ...DEFAULT_SETTINGS, ...((s.data?.value as Partial<LgpdSettings>) ?? {}) });
    const pn = { versao: "1", texto: "", atualizado_em: "", encarregado_nome: "", encarregado_email: "", ...((n.data?.value as Partial<PrivacyNotice>) ?? {}) };
    setNotice(pn);
    setSavedNoticeText(pn.texto);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!permsLoading && isAdmin) load();
  }, [permsLoading, isAdmin, load]);

  const pending = requests.filter((r) => r.status === "pendente" || r.status === "em_andamento");
  const overdue = pending.filter((r) => new Date(r.prazo + "T23:59:59") < new Date());
  const openIncidents = incidents.filter((i) => i.status !== "encerrado");

  const filteredAccesses = useMemo(() => {
    const q = accessFilter.trim().toLowerCase();
    if (!q) return accesses;
    return accesses.filter((a) => `${a.ator_email} ${a.recurso} ${a.detalhe} ${a.titular_id}`.toLowerCase().includes(q));
  }, [accesses, accessFilter]);

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from("system_settings").upsert({ key: "lgpd_settings", value: settings, updated_at: new Date().toISOString() });
    setSaving(false);
    toast(error ? { variant: "destructive", title: "Erro ao salvar", description: error.message } : { title: "Configurações de LGPD salvas" });
  };

  const saveNotice = async (bump: boolean) => {
    setSaving(true);
    const next: PrivacyNotice = {
      ...notice,
      versao: bump ? String((parseInt(notice.versao, 10) || 0) + 1) : notice.versao,
      atualizado_em: new Date().toISOString().slice(0, 10),
    };
    const { error } = await supabase.from("system_settings").upsert({ key: "privacy_notice", value: next, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
      return;
    }
    setNotice(next);
    setSavedNoticeText(next.texto);
    toast({
      title: bump ? `Aviso publicado (versão ${next.versao})` : "Aviso salvo",
      description: bump ? "Todos verão o novo texto no próximo acesso e precisarão registrar ciência." : undefined,
    });
  };

  const runRetention = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("lgpd-retencao", { body: {} });
      if (error) {
        // Sem a função de borda publicada: aplica pelo banco (arquivos ficam na fila).
        const { data: db, error: dbErr } = await supabase.rpc("lgpd_aplicar_retencao");
        if (dbErr) throw dbErr;
        setLastRun(db as Record<string, unknown>);
      } else {
        setLastRun(data as Record<string, unknown>);
      }
      toast({ title: "Política de retenção aplicada" });
      load();
    } catch (err) {
      toast({ variant: "destructive", title: "Não foi possível aplicar", description: (err as Error).message });
    } finally {
      setRunning(false);
    }
  };

  const saveAnswer = async () => {
    if (!answering) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const done = answering.status === "concluida" || answering.status === "recusada";
    const { error } = await supabase
      .from("lgpd_solicitacoes")
      .update({
        status: answering.status,
        resposta: answering.resposta,
        respondido_por: done ? user?.id ?? null : null,
        respondido_em: done ? new Date().toISOString() : null,
      })
      .eq("id", answering.id);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
      return;
    }
    if (done && answering.titular_id) {
      await supabase.from("notificacoes").insert({
        usuario_id: answering.titular_id,
        titulo: `Solicitação LGPD #${answering.protocolo} ${answering.status === "concluida" ? "concluída" : "respondida"}`,
        mensagem: answering.resposta || "",
        link: "/perfil#privacidade",
      });
    }
    setAnswering(null);
    load();
  };

  const saveIncident = async () => {
    if (!editingIncident?.titulo) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      titulo: editingIncident.titulo,
      descricao: editingIncident.descricao ?? null,
      detectado_em: editingIncident.detectado_em ?? new Date().toISOString(),
      categorias_dados: editingIncident.categorias_dados ?? null,
      titulares_afetados: editingIncident.titulares_afetados ?? null,
      severidade: editingIncident.severidade ?? "media",
      status: editingIncident.status ?? "aberto",
      medidas: editingIncident.medidas ?? null,
      comunicado_anpd_em: editingIncident.comunicado_anpd_em ?? null,
      comunicado_titulares_em: editingIncident.comunicado_titulares_em ?? null,
    };
    const { error } = editingIncident.id
      ? await supabase.from("lgpd_incidentes").update(payload).eq("id", editingIncident.id)
      : await supabase.from("lgpd_incidentes").insert({ ...payload, criado_por: user?.id ?? null });
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
      return;
    }
    setEditingIncident(null);
    load();
  };

  if (permsLoading) return null;

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Lock className="mx-auto mb-3 h-8 w-8" /> Apenas Admin/Master acessam a gestão de privacidade.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-[26px] font-bold tracking-tight">Privacidade (LGPD)</h1>
        <p className="text-sm text-muted-foreground mt-1">Solicitações de titulares, incidentes, registros de acesso, retenção e aviso de privacidade.</p>
      </div>

      {mfaBlocked && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
          <p>
            Sua conta tem verificação em duas etapas, mas esta sessão não passou pela segunda etapa. Saia e entre de novo informando o código
            para ver os dados desta tela.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Inbox} label="Solicitações em aberto" value={pending.length} tone={pending.length ? "warn" : undefined} />
        <Kpi icon={Clock} label="Fora do prazo (15 dias)" value={overdue.length} tone={overdue.length ? "bad" : "ok"} />
        <Kpi icon={AlertTriangle} label="Incidentes em aberto" value={openIncidents.length} tone={openIncidents.length ? "bad" : "ok"} />
        <Kpi icon={ShieldCheck} label="2FA exigido p/ admins" value={settings.exigir_mfa_admin ? "Sim" : "Não"} tone={settings.exigir_mfa_admin ? "ok" : "warn"} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="solicitacoes">
          <TabsList className="flex w-full justify-start overflow-x-auto custom-scrollbar h-auto">
            <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
            <TabsTrigger value="incidentes">Incidentes</TabsTrigger>
            <TabsTrigger value="acessos">Registros de acesso</TabsTrigger>
            <TabsTrigger value="retencao">Retenção e segurança</TabsTrigger>
            <TabsTrigger value="aviso">Aviso de privacidade</TabsTrigger>
          </TabsList>

          <TabsContent value="solicitacoes" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {requests.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">Nenhuma solicitação de titular registrada.</p>
                ) : (
                  <ul className="divide-y">
                    {requests.map((r) => {
                      const st = SOLICITACAO_STATUS[r.status] ?? SOLICITACAO_STATUS.pendente;
                      const late = (r.status === "pendente" || r.status === "em_andamento") && new Date(r.prazo + "T23:59:59") < new Date();
                      return (
                        <li key={r.id} className="flex flex-col md:flex-row md:items-center gap-2 p-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-sm">#{r.protocolo} · {tipoLabel(r.tipo)}</span>
                              <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", st.cls)}>{st.label}</span>
                              {late && <span className="sla-chip sla-bad">Fora do prazo</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {r.titular_nome || "—"} · {r.titular_email || "—"} · aberta {fmtDate(r.criado_em)} · prazo{" "}
                              {new Date(r.prazo + "T12:00:00").toLocaleDateString("pt-BR")}
                            </p>
                            {r.descricao && <p className="text-sm mt-1 whitespace-pre-wrap">{r.descricao}</p>}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setAnswering(r)}>
                            Responder
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
            <p className="mt-3 text-xs text-muted-foreground">
              Para anonimizar um usuário (pedido de anonimização/eliminação), use o menu do usuário em Usuários → "Anonimizar (LGPD)".
            </p>
          </TabsContent>

          <TabsContent value="incidentes" className="mt-4 space-y-3">
            <div className="flex justify-between items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Incidente que possa gerar risco ou dano relevante deve ser comunicado à ANPD e aos titulares em até 3 dias úteis.
              </p>
              <Button onClick={() => setEditingIncident({ severidade: "media", status: "aberto", detectado_em: new Date().toISOString() })}>
                <Plus size={16} /> Registrar incidente
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                {incidents.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">Nenhum incidente registrado.</p>
                ) : (
                  <ul className="divide-y">
                    {incidents.map((i) => {
                      const deadline = addBusinessDays(new Date(i.detectado_em), 3);
                      const late = !i.comunicado_anpd_em && i.status !== "encerrado" && deadline < new Date();
                      return (
                        <li key={i.id} className="p-4 flex flex-col md:flex-row md:items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-sm">{i.titulo}</span>
                              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", SEVERIDADE[i.severidade]?.cls)}>
                                {SEVERIDADE[i.severidade]?.label}
                              </span>
                              <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold">{INC_STATUS[i.status]}</span>
                              {late && <span className="sla-chip sla-bad">Comunicação à ANPD atrasada</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Detectado {fmtDate(i.detectado_em)} · comunicar até {deadline.toLocaleDateString("pt-BR")}
                              {i.comunicado_anpd_em && ` · ANPD comunicada ${fmtDate(i.comunicado_anpd_em)}`}
                              {i.titulares_afetados != null && ` · ${i.titulares_afetados} titular(es)`}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setEditingIncident(i)}>
                            Abrir
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="acessos" className="mt-4 space-y-3">
            <Input placeholder="Filtrar por quem acessou, tipo ou detalhe…" value={accessFilter} onChange={(e) => setAccessFilter(e.target.value)} className="max-w-sm" />
            <Card>
              <CardContent className="p-0">
                {filteredAccesses.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">Nenhum acesso registrado.</p>
                ) : (
                  <ul className="divide-y text-sm">
                    {filteredAccesses.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                        <Eye size={14} className="text-muted-foreground" />
                        <span className="font-medium">{a.ator_email}</span>
                        <span className="text-muted-foreground">{RECURSO_LABEL[a.recurso] ?? a.recurso}</span>
                        {a.detalhe && <span className="text-muted-foreground truncate max-w-[260px]">· {a.detalhe}</span>}
                        <span className="ml-auto text-xs text-muted-foreground">{fmtDate(a.criado_em)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              Registra quando alguém abre anexo, cadastro ou contato completo de outra pessoa (LGPD, art. 37). Cada titular vê os acessos aos próprios
              dados em Meu perfil.
            </p>
          </TabsContent>

          <TabsContent value="retencao" className="mt-4 grid gap-4 lg:grid-cols-2 items-start">
            <Card>
              <CardHeader>
                <CardTitle>Prazos de retenção</CardTitle>
                <CardDescription>Depois do prazo, os dados são anonimizados ou apagados automaticamente (todos os dias às 03:30).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DaysField
                  label="Anonimizar texto de chamados encerrados há mais de"
                  hint="Mantém título, datas e métricas (relatórios continuam funcionando); remove descrição e conversas."
                  value={settings.anonimizar_chamados_apos_dias}
                  onChange={(v) => setSettings({ ...settings, anonimizar_chamados_apos_dias: v })}
                />
                <DaysField
                  label="Apagar anexos de chamados encerrados há mais de"
                  value={settings.remover_anexos_apos_dias}
                  onChange={(v) => setSettings({ ...settings, remover_anexos_apos_dias: v })}
                />
                <DaysField
                  label="Apagar logs de auditoria com mais de"
                  value={settings.retencao_auditoria_dias}
                  onChange={(v) => setSettings({ ...settings, retencao_auditoria_dias: v })}
                />
                <DaysField
                  label="Apagar registros de acesso com mais de"
                  value={settings.retencao_acessos_dias}
                  onChange={(v) => setSettings({ ...settings, retencao_acessos_dias: v })}
                />
                <p className="text-xs text-muted-foreground">Use 0 para não aplicar aquele item.</p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveSettings} disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
                  </Button>
                  {isMaster && (
                    <Button variant="outline" onClick={runRetention} disabled={running}>
                      {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Aplicar agora
                    </Button>
                  )}
                </div>
                {lastRun && (
                  <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-0.5">
                    <p>Chamados anonimizados: {String(lastRun.chamados_anonimizados ?? 0)}</p>
                    <p>Arquivos removidos/na fila: {String(lastRun.arquivos_removidos ?? lastRun.arquivos_para_remover ?? 0)}</p>
                    <p>Logs de auditoria apagados: {String(lastRun.logs_auditoria_removidos ?? 0)}</p>
                    <p>Registros de acesso apagados: {String(lastRun.registros_acesso_removidos ?? 0)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Segurança de acesso</CardTitle>
                <CardDescription>Medidas técnicas exigidas de quem administra dados pessoais.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label>Exigir verificação em duas etapas de Admin/Master</Label>
                    <p className="text-sm text-muted-foreground">Administradores sem 2FA serão obrigados a configurar antes de continuar.</p>
                  </div>
                  <Switch checked={settings.exigir_mfa_admin} onCheckedChange={(v) => setSettings({ ...settings, exigir_mfa_admin: v })} />
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground border-t pt-4">
                  <li className="flex gap-2"><ShieldCheck size={15} className="mt-0.5 text-emerald-600 shrink-0" /> Anexos privados, abertos só por link temporário.</li>
                  <li className="flex gap-2"><ShieldCheck size={15} className="mt-0.5 text-emerald-600 shrink-0" /> Auditoria sem dados pessoais em claro.</li>
                  <li className="flex gap-2"><ShieldCheck size={15} className="mt-0.5 text-emerald-600 shrink-0" /> Bloqueio de 15 min após 5 senhas erradas (requer o Auth Hook ativo no Supabase).</li>
                  <li className="flex gap-2"><ShieldCheck size={15} className="mt-0.5 text-emerald-600 shrink-0" /> Chamados com dado sensível visíveis só a solicitante, responsável e Admin.</li>
                </ul>
                <Button onClick={saveSettings} disabled={saving} variant="outline">
                  <Save size={16} /> Salvar
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aviso" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText size={18} /> Aviso de privacidade · versão {notice.versao}
                </CardTitle>
                <CardDescription>
                  Exibido na tela de login e, a cada nova versão publicada, todos registram ciência no próximo acesso.
                  {notice.atualizado_em && ` Última atualização: ${new Date(notice.atualizado_em + "T12:00:00").toLocaleDateString("pt-BR")}.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Encarregado de dados (DPO)</Label>
                    <Input value={notice.encarregado_nome} onChange={(e) => setNotice({ ...notice, encarregado_nome: e.target.value })} placeholder="Nome" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>E-mail do encarregado</Label>
                    <Input type="email" value={notice.encarregado_email} onChange={(e) => setNotice({ ...notice, encarregado_email: e.target.value })} placeholder="dpo@empresa.com" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Texto</Label>
                  <Textarea rows={14} value={notice.texto} onChange={(e) => setNotice({ ...notice, texto: e.target.value })} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => saveNotice(true)} disabled={saving || !notice.texto.trim()}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Publicar nova versão
                  </Button>
                  <Button variant="outline" onClick={() => saveNotice(false)} disabled={saving}>
                    Salvar sem nova versão
                  </Button>
                  {notice.texto !== savedNoticeText && <span className="self-center text-xs text-amber-600">Alterações não salvas</span>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!answering} onOpenChange={(o) => !o && setAnswering(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Solicitação #{answering?.protocolo} · {answering && tipoLabel(answering.tipo)}</DialogTitle>
            <DialogDescription>
              {answering?.titular_nome} · {answering?.titular_email}
            </DialogDescription>
          </DialogHeader>
          {answering && (
            <div className="space-y-4">
              {answering.descricao && <p className="rounded-lg bg-muted/60 p-3 text-sm whitespace-pre-wrap">{answering.descricao}</p>}
              <div className="space-y-1.5">
                <Label>Situação</Label>
                <Select value={answering.status} onValueChange={(v) => setAnswering({ ...answering, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOLICITACAO_STATUS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Resposta ao titular</Label>
                <Textarea rows={5} value={answering.resposta ?? ""} onChange={(e) => setAnswering({ ...answering, resposta: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAnswering(null)}>
              Cancelar
            </Button>
            <Button onClick={saveAnswer} disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingIncident} onOpenChange={(o) => !o && setEditingIncident(null)}>
        <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingIncident?.id ? "Incidente" : "Registrar incidente"}</DialogTitle>
            <DialogDescription>Registro exigido pela Resolução CD/ANPD nº 15/2024.</DialogDescription>
          </DialogHeader>
          {editingIncident && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Título</Label>
                <Input value={editingIncident.titulo ?? ""} onChange={(e) => setEditingIncident({ ...editingIncident, titulo: e.target.value })} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>O que aconteceu</Label>
                <Textarea rows={3} value={editingIncident.descricao ?? ""} onChange={(e) => setEditingIncident({ ...editingIncident, descricao: e.target.value })} />
              </div>
              <DateTimeField label="Detectado em" value={editingIncident.detectado_em} onChange={(v) => setEditingIncident({ ...editingIncident, detectado_em: v ?? new Date().toISOString() })} />
              <div className="space-y-1.5">
                <Label>Titulares afetados (aprox.)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editingIncident.titulares_afetados ?? ""}
                  onChange={(e) => setEditingIncident({ ...editingIncident, titulares_afetados: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Severidade</Label>
                <Select value={editingIncident.severidade ?? "media"} onValueChange={(v) => setEditingIncident({ ...editingIncident, severidade: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERIDADE).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Situação</Label>
                <Select value={editingIncident.status ?? "aberto"} onValueChange={(v) => setEditingIncident({ ...editingIncident, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INC_STATUS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Dados afetados</Label>
                <Input
                  placeholder="Ex.: nome, e-mail, anexos de chamados"
                  value={editingIncident.categorias_dados ?? ""}
                  onChange={(e) => setEditingIncident({ ...editingIncident, categorias_dados: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Medidas tomadas</Label>
                <Textarea rows={3} value={editingIncident.medidas ?? ""} onChange={(e) => setEditingIncident({ ...editingIncident, medidas: e.target.value })} />
              </div>
              <DateTimeField label="ANPD comunicada em" value={editingIncident.comunicado_anpd_em} onChange={(v) => setEditingIncident({ ...editingIncident, comunicado_anpd_em: v })} />
              <DateTimeField
                label="Titulares comunicados em"
                value={editingIncident.comunicado_titulares_em}
                onChange={(v) => setEditingIncident({ ...editingIncident, comunicado_titulares_em: v })}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingIncident(null)}>
              Cancelar
            </Button>
            <Button onClick={saveIncident} disabled={saving || !editingIncident?.titulo}>
              {saving && <Loader2 size={16} className="animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number | string; tone?: "ok" | "warn" | "bad" }) {
  return (
    <Card className="p-4 flex flex-col gap-1.5">
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon size={15} /> {label}
      </span>
      <span
        className={cn(
          "text-2xl font-bold tabular-nums",
          tone === "bad" && Number(value) > 0 && "text-destructive",
          tone === "warn" && "text-amber-600",
          tone === "ok" && "text-emerald-600"
        )}
      >
        {value}
      </span>
    </Card>
  );
}

function DaysField({ label, hint, value, onChange }: { label: string; hint?: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <Input type="number" min={0} className="w-28" value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} />
        <span className="text-sm text-muted-foreground">dias {value >= 365 ? `(~${(value / 365).toFixed(value % 365 ? 1 : 0)} ano${value >= 730 ? "s" : ""})` : ""}</span>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function DateTimeField({ label, value, onChange }: { label: string; value?: string | null; onChange: (v: string | null) => void }) {
  const local = value ? new Date(new Date(value).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="datetime-local" value={local} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} />
    </div>
  );
}
