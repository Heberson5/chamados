import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MOBIZON_ENDPOINT = "https://api.mobizon.com.br/service/message/sendsmsmessage";

// Normaliza número de celular para o formato internacional exigido pela
// Mobizon (DDI + DDD + número, só dígitos). O DDI é sempre o configurado
// em Configurações > SMS (fixo em 55/Brasil), nunca adivinhado pelo
// tamanho do número.
function normalizePhone(raw: string, ddi: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // remove DDI duplicado, caso o usuário já tenha digitado com o código do país
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Exige chamador autenticado (mesmo padrão do send-email).
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

  try {
    const body = await req.json();
    const to: string = body.to;
    const text: string = body.text;
    const providedSettings = body.settings;

    if (!to || !text) {
      throw new Error("Parâmetros obrigatórios ausentes (to, text).");
    }

    let config = providedSettings;
    if (!config) {
      const { data: settingsData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "sms_config")
        .maybeSingle();
      if (!settingsData) {
        throw new Error("Configuração de SMS não encontrada.");
      }
      config = settingsData.value;
    }

    if (!config?.api_key) {
      throw new Error("Chave da API da Mobizon não configurada.");
    }

    const ddi = (config.ddi || "55").replace(/\D/g, "") || "55";
    const recipient = normalizePhone(to, ddi);
    if (!recipient) {
      throw new Error(`Número de celular inválido: ${to}`);
    }

    const params = new URLSearchParams({
      recipient,
      text,
      apiKey: config.api_key,
      output: "json",
    });
    if (config.sender_id) {
      params.set("from", config.sender_id);
    }

    const res = await fetch(MOBIZON_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const result = await res.json();

    if (!res.ok || result.code !== 0) {
      const msg = result?.message || `Falha ao enviar SMS (código ${result?.code ?? res.status}).`;
      throw new Error(msg);
    }

    return new Response(JSON.stringify({ success: true, data: result.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending SMS:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
