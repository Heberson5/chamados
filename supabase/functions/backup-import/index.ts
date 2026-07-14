import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: userRes } = await admin.auth.getUser(token);
  const user = userRes?.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: profile } = await admin.from("profiles")
    .select("is_master, regra").eq("id", user.id).maybeSingle();
  const isMaster = profile?.is_master || String(profile?.regra || "").toUpperCase() === "MASTER";
  if (!isMaster) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const dryRun = !!body.dry_run;
  const tables = body?.tables || body?.payload?.tables;
  if (!tables || typeof tables !== "object") {
    return new Response(JSON.stringify({ error: "missing_tables" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: log } = await admin.from("backup_logs").insert({
    tipo: "import_json", status: "iniciado", destino: "download",
    usuario_id: user.id, usuario_email: user.email,
  }).select().single();

  const summary: Record<string, { rows: number; error?: string }> = {};
  let total = 0;
  try {
    for (const [table, rows] of Object.entries(tables)) {
      const arr = Array.isArray(rows) ? rows : [];
      if (arr.length === 0) { summary[table] = { rows: 0 }; continue; }
      if (dryRun) { summary[table] = { rows: arr.length }; total += arr.length; continue; }
      const { error } = await admin.from(table).upsert(arr as any, { onConflict: "id" });
      summary[table] = { rows: arr.length, ...(error ? { error: error.message } : {}) };
      total += arr.length;
    }
    if (log) {
      await admin.from("backup_logs").update({
        status: "sucesso", finalizado_em: new Date().toISOString(),
        total_registros: total, tabelas_incluidas: Object.keys(tables),
      }).eq("id", log.id);
    }
    return new Response(JSON.stringify({ ok: true, dry_run: dryRun, summary, total }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    if (log) {
      await admin.from("backup_logs").update({
        status: "erro", finalizado_em: new Date().toISOString(), erro: String(e?.message || e),
      }).eq("id", log.id);
    }
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});