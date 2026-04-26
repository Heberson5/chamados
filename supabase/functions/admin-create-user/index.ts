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

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("regra, is_master")
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
    } = body;

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

    // Upsert profile with extra fields + must_change_password
    const profilePayload: Record<string, unknown> = {
      id: userId,
      email,
      nome,
      sobrenome: sobrenome ?? "",
      regra,
      is_master: regra === "MASTER",
      ativo: true,
      must_change_password: true,
      password_changed_at: new Date().toISOString(),
    };
    if (telefone !== undefined) profilePayload.telefone = telefone;
    if (ramal !== undefined) profilePayload.ramal = ramal;
    if (cidade !== undefined) profilePayload.cidade = cidade;
    if (setor !== undefined && setor) profilePayload.setor = setor;

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