import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Senha provisória com gerador criptográfico (Math.random não é seguro).
function generateTempPassword(length = 12) {
  const charset = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  let retVal = "";
  for (let i = 0; i < length; ++i) retVal += charset.charAt(bytes[i] % charset.length);
  return retVal;
}

// Limites de pedidos (por e-mail e por IP) na última hora.
const MAX_POR_EMAIL = 3;
const MAX_POR_IP = 10;

const MOBIZON_ENDPOINT = "https://api.mobizon.com.br/service/message/sendsmsmessage";

function normalizePhone(raw: string, ddi: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // remove DDI duplicado, caso o número já esteja digitado com o código do país
  if (digits.startsWith(ddi) && digits.length > 11) {
    digits = digits.slice(ddi.length);
  }
  digits = digits.replace(/^0+/, ""); // remove zero de discagem local, se houver
  if (digits.length < 10 || digits.length > 11) return null;
  return `${ddi}${digits}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { email, channel } = await req.json();
    const useSms = channel === "sms";

    if (!email) {
      return new Response(JSON.stringify({ error: "E-mail é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const genericOk = () =>
      new Response(JSON.stringify({ success: true, message: "Se o e-mail estiver cadastrado, uma senha provisória foi enviada." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // 0. Limite de tentativas: evita que alguém fique trocando a senha de
    //    outra pessoa em loop (bloqueando o acesso dela) ou enumere e-mails.
    const ip = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "").split(",")[0].trim() || null;
    const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const [{ count: porEmail }, { count: porIp }] = await Promise.all([
      admin.from("password_reset_tentativas").select("id", { count: "exact", head: true })
        .ilike("email", String(email).trim()).gte("criado_em", umaHoraAtras),
      ip
        ? admin.from("password_reset_tentativas").select("id", { count: "exact", head: true })
            .eq("ip", ip).gte("criado_em", umaHoraAtras)
        : Promise.resolve({ count: 0 }),
    ]);
    await admin.from("password_reset_tentativas").insert({ email: String(email).trim().toLowerCase(), ip });
    if ((porEmail ?? 0) >= MAX_POR_EMAIL || (porIp ?? 0) >= MAX_POR_IP) {
      // Mesma resposta de sucesso: não revela que o limite foi atingido.
      return genericOk();
    }
    // Limpeza oportunista do histórico (mantém só 2 dias).
    admin.from("password_reset_tentativas").delete()
      .lt("criado_em", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()).then(() => undefined);

    // 1. Check if user exists in profiles
    const { data: profile, error: profError } = await admin
      .from("profiles")
      .select("id, email, nome, telefone")
      .eq("email", email)
      .single();

    if (profError || !profile) {
      // Return success anyway for security to prevent email enumeration
      return new Response(JSON.stringify({ success: true, message: "Se o e-mail estiver cadastrado, uma senha provisória foi enviada." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se o usuário pediu SMS, valida a configuração e o celular ANTES de
    // girar a senha — não faz sentido invalidar a senha atual se não há
    // como entregar a nova.
    let recipientPhone: string | null = null;
    let smsConfig: { api_key?: string; sender_id?: string; ddi?: string } | undefined;
    if (useSms) {
      const { data: smsSettingsData } = await admin
        .from("system_settings")
        .select("value")
        .eq("key", "sms_config")
        .maybeSingle();
      smsConfig = smsSettingsData?.value as any;
      if (!smsConfig?.api_key) {
        return new Response(JSON.stringify({ error: "Recuperação por SMS não está configurada. Peça a um administrador para configurar a Mobizon em Configurações > SMS." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const ddi = (smsConfig.ddi || "55").replace(/\D/g, "") || "55";
      recipientPhone = normalizePhone(profile.telefone || "", ddi);
      if (!recipientPhone) {
        return new Response(JSON.stringify({ error: "Nenhum número de celular cadastrado para este usuário. Escolha a recuperação por e-mail ou atualize o telefone no cadastro." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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

    // 3. Deliver the temporary password via the chosen channel.
    if (useSms && recipientPhone && smsConfig?.api_key) {
      const params = new URLSearchParams({
        recipient: recipientPhone,
        text: `Sua senha provisoria do sistema de Chamados e: ${tempPassword}. Troque-a no primeiro login.`,
        apiKey: smsConfig.api_key,
        output: "json",
      });
      if (smsConfig.sender_id) params.set("from", smsConfig.sender_id);

      const smsRes = await fetch(MOBIZON_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const smsResult = await smsRes.json();
      if (!smsRes.ok || smsResult.code !== 0) {
        throw new Error(smsResult?.message || "Falha ao enviar SMS.");
      }

      return new Response(JSON.stringify({ success: true, message: "Senha provisória enviada por SMS." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Canal padrão: e-mail (reusing send-email logic)
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
