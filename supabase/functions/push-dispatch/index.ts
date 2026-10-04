// Envia notificação push (PWA) quando uma linha é criada em "notificacoes".
// Configure em Supabase > Database > Webhooks: tabela notificacoes, evento
// INSERT, tipo "Supabase Edge Functions" -> push-dispatch, com o header
// x-webhook-secret igual ao secret PUSH_WEBHOOK_SECRET.
// Secrets necessários: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// (ex.: mailto:ti@empresa.com) e PUSH_WEBHOOK_SECRET.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

Deno.serve(async (req) => {
  const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const okSecret = secret ? req.headers.get("x-webhook-secret") === secret : false;
  if (!okSecret && token !== serviceKey) return new Response("forbidden", { status: 403 });

  const pub = Deno.env.get("VAPID_PUBLIC_KEY");
  const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return new Response(JSON.stringify({ skipped: "VAPID não configurado" }), { status: 200 });
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com", pub, priv);

  const payload = await req.json().catch(() => null);
  const record = payload?.record;
  if (!record?.usuario_id) return new Response(JSON.stringify({ skipped: "sem destinatário" }), { status: 200 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", record.usuario_id);

  // Conteúdo mínimo no push (aparece na tela de bloqueio): sem dados pessoais.
  const body = JSON.stringify({
    title: String(record.titulo || "Chamados").slice(0, 80),
    body: String(record.mensagem || "").slice(0, 140),
    url: record.link || "/chamados",
  });

  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 3600 });
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
    }
  }
  return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
});
