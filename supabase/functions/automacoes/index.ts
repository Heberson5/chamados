// Rotina periódica: avisos de SLA vencido, encerramento de chamados parados,
// política de retenção (LGPD) e relatório por e-mail quando estiver no dia.
// Use quando o projeto não tiver pg_cron: agende esta função a cada 10 min
// (Supabase > Edge Functions > Schedules) com a service_role key.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  if (token !== serviceKey) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const admin = createClient(url, serviceKey);

  const result: Record<string, unknown> = {};
  const { data: rotina, error } = await admin.rpc("chamados_rotina_automacoes");
  result.rotina = error ? { erro: error.message } : rotina;

  // Retenção uma vez por dia (a função é idempotente; roda de madrugada).
  const hourBr = (new Date().getUTCHours() + 21) % 24;
  if (hourBr === 3) {
    const r = await fetch(`${url}/functions/v1/lgpd-retencao`, { method: "POST", headers: { Authorization: `Bearer ${serviceKey}` } });
    result.retencao = await r.json().catch(() => null);
  }

  const rel = await fetch(`${url}/functions/v1/relatorio-agendado`, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: "{}",
  });
  result.relatorio = await rel.json().catch(() => null);

  return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
