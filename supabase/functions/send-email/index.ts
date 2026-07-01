 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
 import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type",
 };
 
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

 Deno.serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
   const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

   // Require authenticated caller
   const authHeader = req.headers.get("Authorization");
   if (!authHeader) {
     return new Response(JSON.stringify({ error: "Unauthorized" }), {
       status: 401,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
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

  let logId: string | null = null;
  let to = "";
  let subject = "";

   try {
     const body = await req.json();
    to = body.to;
    subject = body.subject;
    const html: string = body.html;
    const providedSettings = body.settings;
    const context: string | undefined = body.context;

    if (!to || !subject || !html) {
      throw new Error("Parâmetros obrigatórios ausentes (to, subject, html).");
    }
    if (!isValidEmail(to)) {
      throw new Error(`Destinatário inválido: ${to}`);
    }

    // Cria log inicial
    const { data: logRow } = await supabase
      .from("email_logs")
      .insert({ recipient: to, subject, status: "pending", context: context ?? null })
      .select("id")
      .single();
    logId = logRow?.id ?? null;
 
     // Use provided settings or fetch from DB
     let config = providedSettings;
     if (!config) {
       const { data: settingsData } = await supabase
         .from("system_settings")
         .select("value")
         .eq("key", "email_config")
        .maybeSingle();
       
       if (!settingsData) {
         throw new Error("Configuração de e-mail não encontrada.");
       }
       config = settingsData.value;
     }
 
     if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
       throw new Error("Configurações SMTP incompletas.");
     }
 
     const port = parseInt(config.smtp_port) || 587;
     const isImplicitTLS = port === 465;
 
    let lastError: unknown = null;
    let attempts = 0;
    let sent = false;

    while (attempts < MAX_ATTEMPTS && !sent) {
      attempts++;
      const client = new SMTPClient({
        connection: {
          hostname: config.smtp_host,
          port: port,
          tls: isImplicitTLS,
          auth: {
            username: config.smtp_user,
            password: config.smtp_pass,
          },
        },
      });
      try {
        await client.send({
          from: config.sender || config.smtp_user,
          to: to,
          subject: subject,
          content: html.replace(/<[^>]*>/g, ""),
          html: html,
        });
        sent = true;
      } catch (err) {
        lastError = err;
        console.error(`Tentativa ${attempts} falhou:`, err);
        if (attempts < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempts);
      } finally {
        try { await client.close(); } catch {}
      }
    }

    if (!sent) {
      const msg = lastError instanceof Error ? lastError.message : String(lastError);
      if (logId) {
        await supabase.from("email_logs").update({
          status: "failed",
          attempts,
          error_message: msg,
          updated_at: new Date().toISOString(),
        }).eq("id", logId);
      }
      throw new Error(msg);
    }

    if (logId) {
      await supabase.from("email_logs").update({
        status: "sent",
        attempts,
        updated_at: new Date().toISOString(),
      }).eq("id", logId);
    }
 
     return new Response(JSON.stringify({ success: true }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error: any) {
     console.error("Error sending email:", error);
    if (logId) {
      try {
        await supabase.from("email_logs").update({
          status: "failed",
          error_message: error.message,
          updated_at: new Date().toISOString(),
        }).eq("id", logId);
      } catch {}
    }
     return new Response(JSON.stringify({ error: error.message }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });