import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Validate caller is admin/master
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Set current user ID for auditing in triggers
    await admin.rpc('set_session_user_id', { user_id: caller.id });

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("regra, is_master, organization_id")
      .eq("id", caller.id)
      .single();

    const isPriv =
      callerProfile?.is_master ||
      callerProfile?.regra === "MASTER" ||
      callerProfile?.regra === "ADMIN";
    if (!isPriv) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerIsMaster = callerProfile?.is_master || callerProfile?.regra === "MASTER";

    const body = await req.json();
    const {
      mode, // "password" | "invite"
      email,
      password,
      nome,
      sobrenome,
      regra = "USUARIO",
      telefone,
      ramal,
       cidade,
        setor,
        pode_receber_chamados,
        department_id,
        admin_departments,
    } = body;

    // Only Master can create Master users
    if (regra === "MASTER" && !callerIsMaster) {
      return new Response(JSON.stringify({ error: "Apenas Master pode criar usuário Master" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || !nome) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios faltando" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string | null = null;

    if (mode === "invite") {
      const redirectTo = `${req.headers.get("origin") ?? ""}/login`;
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { full_name: `${nome} ${sobrenome ?? ""}`.trim() },
      });
      if (error) throw error;
      userId = data.user?.id ?? null;
    } else {
      if (!password || password.length < 8) {
        return new Response(JSON.stringify({ error: "Senha inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `${nome} ${sobrenome ?? ""}`.trim() },
      });
      if (error) throw error;
      userId = data.user?.id ?? null;
    }

    if (!userId) throw new Error("Falha ao criar usuário");

    // Respeita a política configurada em Configurações > Segurança de Senhas
    // (force_change_on_first_login) em vez de sempre forçar a troca.
    const { data: policySetting } = await admin
      .from("system_settings")
      .select("value")
      .eq("key", "password_policy")
      .maybeSingle();
    const forceChangeOnFirstLogin = (policySetting?.value as any)?.force_change_on_first_login !== false;

    // Upsert profile with extra fields + must_change_password
    const profilePayload: Record<string, unknown> = {
      id: userId,
      email,
      nome,
      sobrenome: sobrenome ?? "",
      regra,
      is_master: regra === "MASTER",
      ativo: true,
      must_change_password: forceChangeOnFirstLogin,
      password_changed_at: new Date().toISOString(),
    };
    if (telefone !== undefined) profilePayload.telefone = telefone;
    if (ramal !== undefined) profilePayload.ramal = ramal;
     if (cidade !== undefined) profilePayload.cidade = cidade;
      if (setor !== undefined && setor) profilePayload.setor = setor;
      if (pode_receber_chamados !== undefined) profilePayload.pode_receber_chamados = pode_receber_chamados;
      if (department_id !== undefined) profilePayload.department_id = department_id;
      if (admin_departments !== undefined) profilePayload.admin_departments = admin_departments;

    const { error: profileErr } = await admin
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });
    if (profileErr) throw profileErr;

    return new Response(
      JSON.stringify({ success: true, user_id: userId, mode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("admin-create-user error", e);
    return new Response(JSON.stringify({ error: e.message ?? "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});