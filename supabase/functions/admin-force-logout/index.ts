import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: callerProfile } = await admin.from("profiles").select("regra, is_master").eq("id", caller.id).single();
    const ok = callerProfile?.is_master || callerProfile?.regra === "MASTER" || callerProfile?.regra === "ADMIN";
    if (!ok) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { user_id } = await req.json();
    if (!user_id) return new Response(JSON.stringify({ error: "user_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (user_id === caller.id) {
      return new Response(JSON.stringify({ error: "Você não pode desconectar a si mesmo." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: target } = await admin.from("profiles").select("regra, is_master").eq("id", user_id).single();
    const targetIsMaster = target?.is_master || target?.regra === "MASTER";
    if (targetIsMaster) {
      return new Response(JSON.stringify({ error: "Usuário Master não pode ser desconectado." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.auth.admin.signOut(user_id);
    await admin.from("profiles").update({ force_logout_at: new Date().toISOString() }).eq("id", user_id);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? "Erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});