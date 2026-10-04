// Aplica a política de retenção da LGPD (anonimiza chamados antigos, apaga
// logs vencidos) e remove do Storage os anexos que a rotina desvinculou.
//
// Quem pode chamar:
//  - Admin/Master logado (botão "Aplicar agora" em Privacidade);
//  - um agendamento (Supabase > Edge Functions > Schedules / cron externo)
//    usando a service_role key no header Authorization.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function jwtClaims(token: string): Record<string, unknown> {
  try {
    const part = token.split(".")[1];
    return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const claims = jwtClaims(token);
  const isService = token === serviceKey || claims.role === "service_role";

  if (!isService) {
    const { data: userRes } = await admin.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: profile } = await admin.from("profiles").select("is_master, regra").eq("id", user.id).maybeSingle();
    const allowed = profile?.is_master || ["MASTER", "ADMIN"].includes(String(profile?.regra || "").toUpperCase());
    if (!allowed) return json({ error: "forbidden" }, 403);
    // Quem tem 2FA cadastrado precisa estar com a sessão verificada (aal2).
    const { data: factors } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
    const hasVerified = (factors?.factors ?? []).some((f: { status: string }) => f.status === "verified");
    if (hasVerified && claims.aal !== "aal2") return json({ error: "mfa_required" }, 403);
  }

  const { data: summary, error } = await admin.rpc("lgpd_aplicar_retencao");
  if (error) return json({ error: error.message }, 500);

  let removed = 0;
  const failures: string[] = [];
  for (;;) {
    const { data: batch } = await admin.from("lgpd_arquivos_remover").select("id, bucket, caminho").order("id").limit(100);
    if (!batch || batch.length === 0) break;
    const byBucket = new Map<string, { id: number; caminho: string }[]>();
    for (const row of batch) {
      const list = byBucket.get(row.bucket) ?? [];
      list.push(row);
      byBucket.set(row.bucket, list);
    }
    for (const [bucket, rows] of byBucket) {
      const { error: rmErr } = await admin.storage.from(bucket).remove(rows.map((r) => r.caminho));
      if (rmErr) failures.push(`${bucket}: ${rmErr.message}`);
      else removed += rows.length;
      // Remove da fila mesmo se o arquivo já não existia.
      await admin.from("lgpd_arquivos_remover").delete().in("id", rows.map((r) => r.id));
    }
    if (batch.length < 100) break;
  }

  return json({ ...(summary as Record<string, unknown>), arquivos_removidos: removed, falhas: failures });
});
