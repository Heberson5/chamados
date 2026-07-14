import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MOBIZON_ENDPOINT = "https://api.mobizon.com.br/service/message/sendsmsmessage";

// Normaliza número de celular brasileiro para o formato internacional
// exigido pela Mobizon (código do país + DDD + número, só dígitos).
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12) return digits;
  return null;
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

    const recipient = normalizePhone(to);
    if (!recipient) {
      throw new Error(`Número de celular inválido: ${to}`);
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
