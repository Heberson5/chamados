// Relatório periódico por e-mail (semanal ou mensal) para os gestores.
// Chamado pela função "automacoes" (agendada) ou pelo botão "Enviar agora"
// em Configurações > Automações (Admin/Master, com { forcar: true }).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Cfg = { ativo?: boolean; frequencia?: "semanal" | "mensal"; destinatarios?: string[]; ultimo_envio?: string | null };

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function fmtMin(min: number) {
  if (!min || min <= 0) return "—";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h < 24) return m ? `${h}h ${m}min` : `${h}h`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  if (token !== serviceKey) {
    const { data: userRes } = await admin.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: p } = await admin.from("profiles").select("is_master, regra").eq("id", user.id).maybeSingle();
    if (!(p?.is_master || ["MASTER", "ADMIN"].includes(String(p?.regra || "").toUpperCase()))) return json({ error: "forbidden" }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const forcar = !!body?.forcar;

  const { data: row } = await admin.from("system_settings").select("value").eq("key", "relatorios_agendados").maybeSingle();
  const cfg = (row?.value ?? {}) as Cfg;
  const destinatarios = (cfg.destinatarios ?? []).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (destinatarios.length === 0) return json({ error: "Nenhum destinatário configurado." }, 400);

  // Horário de Brasília para decidir o dia do envio.
  const nowBr = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const last = cfg.ultimo_envio ? new Date(cfg.ultimo_envio) : null;
  const mensal = cfg.frequencia === "mensal";
  if (!forcar) {
    if (!cfg.ativo) return json({ enviado: false, motivo: "desativado" });
    const due = mensal
      ? nowBr.getUTCDate() === 1 && (!last || Date.now() - last.getTime() > 20 * 24 * 3600 * 1000)
      : nowBr.getUTCDay() === 1 && (!last || Date.now() - last.getTime() > 5 * 24 * 3600 * 1000);
    if (!due || nowBr.getUTCHours() < 7) return json({ enviado: false, motivo: "fora do dia/horário" });
  }

  const dias = mensal ? 30 : 7;
  const inicio = new Date(Date.now() - dias * 24 * 3600 * 1000).toISOString();

  const [{ data: tickets }, { data: abertosAgora }, { data: avaliacoes }, { data: perfis }, { data: layout }] = await Promise.all([
    admin.from("chamados").select("id, gerado_em, atendido_em, encerrado_em, status, sla_violado, tecnico_id").gte("gerado_em", inicio).is("deletado_em", null),
    admin.from("chamados").select("id, sla_deadline, status").is("encerrado_em", null).is("deletado_em", null),
    admin.from("chamado_avaliacoes").select("nota").gte("criado_em", inicio),
    admin.from("profiles").select("id, nome, sobrenome"),
    admin.from("system_settings").select("value").eq("key", "layout_settings").maybeSingle(),
  ]);

  const list = tickets ?? [];
  const encerrados = list.filter((t) => t.status === "ENCERRADO");
  const noPrazo = list.filter((t) => !t.sla_violado).length;
  const slaPct = list.length ? Math.round((noPrazo / list.length) * 100) : null;
  const resp = list.filter((t) => t.atendido_em).map((t) => (new Date(t.atendido_em!).getTime() - new Date(t.gerado_em).getTime()) / 60000).filter((m) => m > 0);
  const avgResp = resp.length ? resp.reduce((a, b) => a + b, 0) / resp.length : 0;
  const notas = (avaliacoes ?? []).map((a) => a.nota);
  const csat = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : null;
  const backlog = (abertosAgora ?? []).filter((t) => t.status !== "CANCELADO");
  const vencidos = backlog.filter((t) => t.sla_deadline && new Date(t.sla_deadline) < new Date()).length;

  const porTecnico = new Map<string, number>();
  encerrados.forEach((t) => t.tecnico_id && porTecnico.set(t.tecnico_id, (porTecnico.get(t.tecnico_id) ?? 0) + 1));
  const ranking = [...porTecnico.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => {
    const p = (perfis ?? []).find((x) => x.id === id);
    return { nome: p ? `${p.nome ?? ""} ${p.sobrenome ?? ""}`.trim() : "—", n };
  });

  const empresa = (layout?.value as { companyName?: string } | null)?.companyName || "Chamados";
  const periodo = mensal ? "últimos 30 dias" : "últimos 7 dias";
  const kpi = (label: string, value: string) =>
    `<td style="padding:12px 14px;border:1px solid #e6e6ef;border-radius:10px;background:#fff"><div style="font-size:12px;color:#6b6f80">${esc(label)}</div><div style="font-size:22px;font-weight:700;color:#11131f;margin-top:4px">${esc(value)}</div></td>`;

  const html = `
<div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f6f6fb;padding:24px;color:#11131f">
  <div style="max-width:640px;margin:0 auto">
    <h1 style="font-size:20px;margin:0 0 4px">Resumo do suporte — ${esc(empresa)}</h1>
    <p style="margin:0 0 18px;color:#6b6f80;font-size:14px">${esc(periodo)} · gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
    <table cellspacing="8" style="width:100%;border-collapse:separate"><tr>
      ${kpi("Chamados abertos no período", String(list.length))}
      ${kpi("Encerrados", String(encerrados.length))}
      ${kpi("Dentro do SLA", slaPct == null ? "—" : `${slaPct}%`)}
    </tr><tr>
      ${kpi("Tempo médio de aceite", fmtMin(avgResp))}
      ${kpi("Satisfação (1 a 5)", csat ?? "—")}
      ${kpi("Em aberto agora / vencidos", `${backlog.length} / ${vencidos}`)}
    </tr></table>
    ${ranking.length ? `<h2 style="font-size:15px;margin:18px 0 8px">Técnicos que mais encerraram</h2>
    <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e6e6ef">
      ${ranking.map((r) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${esc(r.nome)}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${r.n}</td></tr>`).join("")}
    </table>` : ""}
    <p style="margin-top:18px;font-size:12px;color:#8b8fa3">Para alterar ou desativar este envio: Configurações › Automações.</p>
  </div>
</div>`;

  let enviados = 0;
  const erros: string[] = [];
  for (const to of destinatarios) {
    const res = await fetch(`${url}/functions/v1/send-email`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject: `Resumo do suporte (${periodo})`, html, context: "relatorio_agendado" }),
    });
    if (res.ok) enviados++;
    else erros.push(`${to}: ${(await res.text()).slice(0, 200)}`);
  }

  await admin.from("system_settings").upsert({ key: "relatorios_agendados", value: { ...cfg, ultimo_envio: new Date().toISOString() } });
  return json({ enviado: enviados > 0, enviados, erros });
});
