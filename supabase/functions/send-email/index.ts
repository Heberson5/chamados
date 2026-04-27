 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
 import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
 
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
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, serviceKey);
 
     const body = await req.json();
     const { to, subject, html, settings: providedSettings } = body;
 
     // Use provided settings or fetch from DB
     let config = providedSettings;
     if (!config) {
       const { data: settingsData } = await supabase
         .from("system_settings")
         .select("value")
         .eq("key", "email_config")
         .single();
       
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
 
     await client.send({
       from: config.sender || config.smtp_user,
       to: to,
       subject: subject,
       content: html.replace(/<[^>]*>/g, ''),
       html: html,
     });
 
     await client.close();
 
     return new Response(JSON.stringify({ success: true }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error: any) {
     console.error("Error sending email:", error);
     return new Response(JSON.stringify({ error: error.message }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });