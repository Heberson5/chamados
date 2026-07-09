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
      .select("regra, is_master, organization_id")
      .eq("id", caller.id)
      .single();

    const callerIsMaster =
      callerProfile?.is_master || callerProfile?.regra === "MASTER";
    const callerIsAdmin = callerProfile?.regra === "ADMIN";
    if (!callerIsMaster && !callerIsAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      user_id,
      email,
      nome,
      sobrenome,
      regra,
      telefone,
      ramal,
      cidade,
        avatar_url,
        pode_receber_chamados,
        department_id,
        admin_departments,
        access_schedule,
        password,
    } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load target profile
    const { data: target } = await admin
      .from("profiles")
      .select("id, regra, is_master, email, organization_id")
      .eq("id", user_id)
      .single();

    if (!target) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetIsMaster = target.is_master || target.regra === "MASTER";

    // Cross-organization boundary: non-master admins can only manage users of their own organization
    if (!callerIsMaster && callerProfile?.organization_id !== target.organization_id) {
      return new Response(JSON.stringify({ error: "Você não pode gerenciar usuários de outra organização." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admins cannot edit Master users; only Master can edit Master.
    if (targetIsMaster && !callerIsMaster) {
      return new Response(JSON.stringify({ error: "Apenas Master pode editar usuário Master" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block deactivation of Master users via this endpoint.
    if (targetIsMaster && body.ativo === false) {
      return new Response(JSON.stringify({ error: "Usuário Master não pode ser desativado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block users from deactivating themselves.
    if (user_id === caller.id && body.ativo === false) {
      return new Response(JSON.stringify({ error: "Você não pode desativar a si mesmo." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admins cannot promote/demote to/from Master.
    if (regra && regra === "MASTER" && !callerIsMaster) {
      return new Response(JSON.stringify({ error: "Apenas Master pode atribuir Master" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update auth email if changed
    if (email && email !== target.email) {
      const { error: emailErr } = await admin.auth.admin.updateUserById(user_id, {
        email,
        email_confirm: true,
      });
      if (emailErr) throw emailErr;
    }

    // Update password if provided (Master/Admin only, and Admin cannot change Master's password)
    if (password && typeof password === "string" && password.length > 0) {
      if (targetIsMaster && !callerIsMaster) {
        return new Response(JSON.stringify({ error: "Apenas Master pode alterar a senha de um Master." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (password.length < 8) {
        return new Response(JSON.stringify({ error: "A senha deve ter no mínimo 8 caracteres." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: pwdErr } = await admin.auth.admin.updateUserById(user_id, { password });
      if (pwdErr) throw pwdErr;
    }

    const profilePayload: Record<string, unknown> = {};
    if (email !== undefined) profilePayload.email = email;
    if (nome !== undefined) profilePayload.nome = nome;
    if (sobrenome !== undefined) profilePayload.sobrenome = sobrenome;
    if (regra !== undefined) {
      profilePayload.regra = regra;
      profilePayload.is_master = regra === "MASTER";
    }
    if (telefone !== undefined) profilePayload.telefone = telefone;
    if (ramal !== undefined) profilePayload.ramal = ramal;
    if (cidade !== undefined) profilePayload.cidade = cidade;
      if (avatar_url !== undefined) profilePayload.avatar_url = avatar_url;
      if (pode_receber_chamados !== undefined) profilePayload.pode_receber_chamados = pode_receber_chamados;
      if (department_id !== undefined) profilePayload.department_id = department_id;
      if (admin_departments !== undefined) profilePayload.admin_departments = admin_departments;
      if (access_schedule !== undefined) profilePayload.access_schedule = access_schedule;

    if (Object.keys(profilePayload).length > 0) {
      const { error: profErr } = await admin
        .from("profiles")
        .update(profilePayload)
        .eq("id", user_id);
      if (profErr) throw profErr;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("admin-update-user error", e);
    return new Response(JSON.stringify({ error: e.message ?? "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});