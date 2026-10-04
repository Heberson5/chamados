import { describe, expect, it } from "vitest";
import { decryptBackup, encryptBackup, isEncryptedBackup } from "./backupCrypto";

describe("backupCrypto", () => {
  it("criptografa e descriptografa com a senha certa", async () => {
    const plain = JSON.stringify({ tables: { profiles: [{ nome: "Ana", email: "ana@x.com" }] } });
    const enc = await encryptBackup(plain, "senha-forte-123");
    expect(enc).not.toContain("ana@x.com");
    const env = JSON.parse(enc);
    expect(isEncryptedBackup(env)).toBe(true);
    expect(await decryptBackup(env, "senha-forte-123")).toBe(plain);
  });

  it("recusa senha errada", async () => {
    const env = JSON.parse(await encryptBackup("{}", "certa-123456"));
    await expect(decryptBackup(env, "errada-123456")).rejects.toThrow(/Senha incorreta/);
  });
});
