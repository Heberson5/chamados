/*
 * Criptografia do arquivo de backup no navegador (AES-256-GCM com chave
 * derivada da senha via PBKDF2-SHA256). O arquivo baixado não expõe dados
 * pessoais se for copiado/vazado; só abre com a senha.
 */

export const BACKUP_ENVELOPE = "chamados-backup-criptografado";
const ITERATIONS = 310_000;

type Envelope = {
  formato: typeof BACKUP_ENVELOPE;
  versao: 1;
  kdf: "PBKDF2-SHA256";
  iteracoes: number;
  salt: string;
  iv: string;
  dados: string;
  criado_em: string;
};

const toB64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function deriveKey(password: string, salt: Uint8Array, iterations: number) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptBackup(plainJson: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plainJson));
  const env: Envelope = {
    formato: BACKUP_ENVELOPE,
    versao: 1,
    kdf: "PBKDF2-SHA256",
    iteracoes: ITERATIONS,
    salt: toB64(salt),
    iv: toB64(iv),
    dados: toB64(cipher),
    criado_em: new Date().toISOString(),
  };
  return JSON.stringify(env);
}

export function isEncryptedBackup(parsed: unknown): parsed is Envelope {
  return !!parsed && typeof parsed === "object" && (parsed as { formato?: string }).formato === BACKUP_ENVELOPE;
}

export async function decryptBackup(env: Envelope, password: string): Promise<string> {
  const key = await deriveKey(password, fromB64(env.salt), env.iteracoes);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(env.iv) }, key, fromB64(env.dados));
    return new TextDecoder().decode(plain);
  } catch {
    throw new Error("Senha incorreta ou arquivo corrompido.");
  }
}
