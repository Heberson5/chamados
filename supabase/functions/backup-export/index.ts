import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TABLES = [
  "organizations","profiles","user_roles","role_definitions","departamentos",
  "categorias","servicos","fornecedores","chamado_statuses","chamados_prioridades",
  "chamados","comentarios_chamado","transferencias_chamado","notificacoes",
  "audit_logs","email_logs","backup_logs","password_history","expedientes",
  "itens_inventario","estoque_setor","movimentacoes_estoque","baixas","itens_baixa",
  "solicitacoes_compra","itens_solicitacao_compra","reembolsos","ordens_de_servico",
  "help_menu_manuals","system_manuals","system_settings","organization_email_settings"
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Authenticate caller and require Master
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

  const { data: log } = await admin.from("backup_logs").insert({
    tipo: "export_json", status: "iniciado", destino: "download",
    usuario_id: user.id, usuario_email: user.email,
  }).select().single();

  const dump: Record<string, any[]> = {};
  let total = 0;
  const included: string[] = [];
  try {
    for (const t of TABLES) {
      const { data, error } = await admin.from(t).select("*");
      if (error) continue;
      dump[t] = data || [];
      total += (data || []).length;
      included.push(t);
    }
    const payload = {
      version: 1,
      exported_at: new Date().toISOString(),
      exported_by: user.email,
      tables: dump,
    };
    const body = JSON.stringify(payload);
    if (log) {
      await admin.from("backup_logs").update({
        status: "sucesso", finalizado_em: new Date().toISOString(),
        tamanho_bytes: body.length, tabelas_incluidas: included, total_registros: total,
      }).eq("id", log.id);
    }
    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup-${new Date().toISOString().slice(0,19)}.json"`,
      },
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