import { supabase } from "@/integrations/supabase/client";

/*
 * Anexos de chamados ficam num bucket PRIVADO ("chamados_anexos"). O banco
 * guarda só o caminho interno do arquivo; para abrir/mostrar, o app pede um
 * link temporário (signed URL) que expira em poucos minutos.
 *
 * Registros antigos ainda podem ter o link público completo gravado — o
 * helper entende os dois formatos.
 */

export const ANEXOS_BUCKET = "chamados_anexos";
const SIGNED_URL_TTL = 300; // segundos

const OLD_URL_RE = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/chamados_anexos\/([^?]+)/;

/** Caminho interno no bucket privado, ou null se for um link externo qualquer. */
export function attachmentPath(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const m = stored.match(OLD_URL_RE);
  if (m) return decodeURIComponent(m[1]);
  if (/^https?:\/\//i.test(stored) || stored.startsWith("data:")) return null;
  return stored;
}

export function attachmentName(stored: string, index?: number): string {
  const path = attachmentPath(stored) ?? stored.split("?")[0];
  const last = path.split("/").pop() || "";
  // Nomes gerados (aleatórios) não dizem nada ao usuário.
  if (!last || /^[0-9.]+\.[a-z0-9]+$/i.test(last) || /^[0-9a-f-]{20,}\.[a-z0-9]+$/i.test(last)) {
    const ext = last.split(".").pop()?.toUpperCase();
    return `Anexo ${index != null ? index + 1 : ""}${ext ? ` (${ext})` : ""}`.replace("  ", " ").trim();
  }
  return last.replace(/^\d{10,}-/, "");
}

export function isImageAttachment(stored: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(stored);
}

/** Envia um arquivo para a pasta do próprio usuário e devolve o caminho a gravar no banco. */
export async function uploadAttachment(file: File, folder: string): Promise<string> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeName = file.name
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .slice(0, 60);
  const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName || "arquivo"}.${ext}`;
  const { error } = await supabase.storage.from(ANEXOS_BUCKET).upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  return path;
}

/** Link temporário para abrir/mostrar o anexo. */
export async function signedAttachmentUrl(stored: string, download = false): Promise<string | null> {
  const path = attachmentPath(stored);
  if (!path) return stored;
  const { data, error } = await supabase.storage
    .from(ANEXOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL, download ? { download: true } : undefined);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Registra (LGPD, art. 37) que alguém acessou dado pessoal de outra pessoa. */
export function logPersonalDataAccess(titularId: string | null | undefined, recurso: string, detalhe?: string) {
  if (!titularId) return;
  supabase.rpc("lgpd_registrar_acesso", { _titular: titularId, _recurso: recurso, _detalhe: detalhe ?? null }).then(
    () => undefined,
    () => undefined
  );
}
