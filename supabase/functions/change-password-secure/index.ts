import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const admin = createClient(supabaseUrl, serviceKey);
    
    // Get user from JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Sessão expirada");

    const { newPassword } = await req.json();
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return new Response(JSON.stringify({ error: "Senha inválida." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Check if new password is the current one. Best-effort: se essa
    // checagem falhar por qualquer motivo (rate limit, RPC ausente, etc.),
    // não deve travar a troca de senha em si — só pula essa validação extra.
    try {
      const { error: loginError } = await createClient(supabaseUrl, anonKey).auth.signInWithPassword({
        email: user.email!,
        password: newPassword,
      });
      if (!loginError) {
        return new Response(JSON.stringify({ error: "A nova senha não pode ser igual à senha atual." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.warn("Same-password check failed, skipping:", e);
    }

    // 2. Check password history. Mesma lógica: falha aqui não pode travar a
    // troca de senha — na pior das hipóteses, pula a checagem de reuso.
    try {
      const { data: history } = await admin
        .from("password_history")
        .select("password_hash")
        .eq("user_id", user.id);

      if (history && history.length > 0) {
        const { data: match, error: checkError } = await admin.rpc("check_password_history", {
          p_user_id: user.id,
          p_password: newPassword
        });

        if (checkError) throw checkError;
        if (match) {
          return new Response(JSON.stringify({ error: "A nova senha não pode ser igual a uma das senhas anteriores." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (e) {
      console.warn("Password history check failed, skipping:", e);
    }

    // 3. Update password in Auth — este é o passo crítico, não pode falhar em silêncio.
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (updateError) throw updateError;

    // 4. Store in history (best-effort — a senha em si já foi trocada no
    // passo 3, então uma falha aqui não pode deixar o usuário travado).
    try {
      const { error: storeError } = await admin.rpc("store_password_history", {
        p_user_id: user.id,
        p_password: newPassword
      });
      if (storeError) console.warn("store_password_history failed:", storeError);
    } catch (e) {
      console.warn("store_password_history threw:", e);
    }

    // 5. Passo crítico: libera o acesso do usuário. Precisa acontecer mesmo
    // que os passos acima (best-effort) tenham falhado.
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        must_change_password: false,
        password_changed_at: new Date().toISOString()
      })
      .eq("id", user.id);
    if (profileError) throw profileError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Change password error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
