import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, Play, Save, Workflow } from "lucide-react";

type Automacoes = { auto_atribuir: boolean; avisar_sla_vencido: boolean; fechar_aguardando_dias: number };
type Relatorios = { ativo: boolean; frequencia: "semanal" | "mensal"; destinatarios: string[]; ultimo_envio?: string | null };

/** Automações de atendimento e relatório periódico por e-mail. */
export default function AutomationsSettings() {
  const { toast } = useToast();
  const [auto, setAuto] = useState<Automacoes>({ auto_atribuir: false, avisar_sla_vencido: true, fechar_aguardando_dias: 0 });
  const [rel, setRel] = useState<Relatorios>({ ativo: false, frequencia: "semanal", destinatarios: [] });
  const [recipients, setRecipients] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<"" | "rotina" | "relatorio">("");

  useEffect(() => {
    Promise.all([
      supabase.from("system_settings").select("value").eq("key", "automacoes").maybeSingle(),
      supabase.from("system_settings").select("value").eq("key", "relatorios_agendados").maybeSingle(),
    ]).then(([a, r]) => {
      if (a.data?.value) setAuto((prev) => ({ ...prev, ...(a.data!.value as Partial<Automacoes>) }));
      if (r.data?.value) {
        const v = { ...rel, ...(r.data.value as Partial<Relatorios>) };
        setRel(v);
        setRecipients((v.destinatarios ?? []).join(", "));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    const destinatarios = recipients
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    const now = new Date().toISOString();
    const [a, r] = await Promise.all([
      supabase.from("system_settings").upsert({ key: "automacoes", value: auto, updated_at: now }),
      supabase.from("system_settings").upsert({ key: "relatorios_agendados", value: { ...rel, destinatarios }, updated_at: now }),
    ]);
    setSaving(false);
    const err = a.error || r.error;
    toast(err ? { variant: "destructive", title: "Erro ao salvar", description: err.message } : { title: "Automações salvas" });
  };

  const runNow = async () => {
    setRunning("rotina");
    const { data, error } = await supabase.rpc("chamados_rotina_automacoes");
    setRunning("");
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
      return;
    }
    const d = data as { sla_avisados?: number; encerrados_automaticamente?: number };
    toast({ title: "Rotina executada", description: `${d.sla_avisados ?? 0} aviso(s) de SLA, ${d.encerrados_automaticamente ?? 0} chamado(s) encerrado(s).` });
  };

  const sendReport = async () => {
    setRunning("relatorio");
    const { data, error } = await supabase.functions.invoke("relatorio-agendado", { body: { forcar: true } });
    setRunning("");
    if (error || data?.error) {
      toast({
        variant: "destructive",
        title: "Não foi possível enviar",
        description: data?.error || "Publique a função relatorio-agendado no Supabase e confira a configuração de e-mail.",
      });
      return;
    }
    toast({ title: "Relatório enviado", description: `Para ${data?.enviados ?? 0} destinatário(s).` });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            <CardTitle>Automações de atendimento</CardTitle>
          </div>
          <CardDescription>Rodam sozinhas a cada 10 minutos (quando o agendamento está ativo no Supabase).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Row
            title="Atribuir automaticamente"
            hint="Chamado aberto sem responsável vai para o técnico com menos chamados em aberto (prioriza o mesmo departamento). O responsável padrão da categoria tem preferência."
          >
            <Switch checked={auto.auto_atribuir} onCheckedChange={(v) => setAuto({ ...auto, auto_atribuir: v })} />
          </Row>
          <Row title="Avisar quando o SLA vencer" hint="Notifica o responsável e os administradores uma única vez por chamado.">
            <Switch checked={auto.avisar_sla_vencido} onCheckedChange={(v) => setAuto({ ...auto, avisar_sla_vencido: v })} />
          </Row>
          <Row title="Encerrar chamados parados aguardando o usuário" hint="Após N dias sem retorno do solicitante. Use 0 para desligar.">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                className="w-20"
                value={auto.fechar_aguardando_dias}
                onChange={(e) => setAuto({ ...auto, fechar_aguardando_dias: Math.max(0, Number(e.target.value) || 0) })}
              />
              <span className="text-sm text-muted-foreground">dias</span>
            </div>
          </Row>
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
            </Button>
            <Button variant="outline" onClick={runNow} disabled={running !== ""}>
              {running === "rotina" ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Executar agora
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Relatório por e-mail</CardTitle>
          </div>
          <CardDescription>Resumo do período (volume, SLA, tempos, técnicos e satisfação) enviado aos gestores.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row title="Enviar automaticamente">
            <Switch checked={rel.ativo} onCheckedChange={(v) => setRel({ ...rel, ativo: v })} />
          </Row>
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <div className="space-y-1.5">
              <Label>Frequência</Label>
              <Select value={rel.frequencia} onValueChange={(v) => setRel({ ...rel, frequencia: v as Relatorios["frequencia"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal (segunda-feira)</SelectItem>
                  <SelectItem value="mensal">Mensal (dia 1º)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Destinatários</Label>
              <Input placeholder="gestor@empresa.com, ti@empresa.com" value={recipients} onChange={(e) => setRecipients(e.target.value)} />
            </div>
          </div>
          {rel.ultimo_envio && <p className="text-xs text-muted-foreground">Último envio: {new Date(rel.ultimo_envio).toLocaleString("pt-BR")}</p>}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
            </Button>
            <Button variant="outline" onClick={sendReport} disabled={running !== ""}>
              {running === "relatorio" ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Enviar agora
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label>{title}</Label>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
