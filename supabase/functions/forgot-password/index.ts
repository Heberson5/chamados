import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateTempPassword(length = 10) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "E-mail é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Check if user exists in profiles
    const { data: profile, error: profError } = await admin
      .from("profiles")
      .select("id, email, nome")
      .eq("email", email)
      .single();

    if (profError || !profile) {
      // Return success anyway for security to prevent email enumeration
      return new Response(JSON.stringify({ success: true, message: "Se o e-mail estiver cadastrado, uma senha provisória foi enviada." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tempPassword = generateTempPassword();

    // 2. Update user password and set must_change_password
    const { error: updateError } = await admin.auth.admin.updateUserById(profile.id, {
      password: tempPassword,
    });

    if (updateError) throw updateError;

    await admin
      .from("profiles")
      .update({ 
        must_change_password: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", profile.id);

    // 3. Send email (reusing send-email logic)
    const { data: settingsData } = await admin
      .from("system_settings")
      .select("value")
      .eq("key", "email_config")
      .maybeSingle();

    if (settingsData?.value) {
      const config = settingsData.value;
      if (config.smtp_host && config.smtp_user && config.smtp_pass) {
        // We use a dynamic import for SMTPClient to keep it standard
        const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
        const port = parseInt(config.smtp_port) || 587;
        const client = new SMTPClient({
          connection: {
            hostname: config.smtp_host,
            port: port,
            tls: port === 465,
            auth: {
              username: config.smtp_user,
              password: config.smtp_pass,
            },
          },
        });

        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #2563eb;">Redefinição de Senha</h2>
            <p>Olá, ${profile.nome || 'Usuário'}.</p>
            <p>Você solicitou uma redefinição de senha para o sistema de Chamados.</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #64748b;">Sua senha provisória é:</p>
              <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #1e293b;">${tempPassword}</p>
            </div>
            <p><strong>Importante:</strong> Você será obrigado a trocar esta senha assim que realizar o primeiro login.</p>
            <p>Se você não solicitou esta alteração, entre em contato com o administrador imediatamente.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">Esta é uma mensagem automática, por favor não responda.</p>
          </div>
        `;

        await client.send({
          from: config.sender || config.smtp_user,
          to: email,
          subject: "Sua Senha Provisória - Chamados",
          content: `Sua senha provisória é: ${tempPassword}. Você deverá alterá-la no próximo login.`,
          html: html,
        });
        await client.close();
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Senha provisória enviada com sucesso." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
*** End Patch
