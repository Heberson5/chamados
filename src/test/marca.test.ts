import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SAUBERLICH_CREDIT, sauberlichCopyright } from "@/lib/marca";
import { renderEmailTemplate } from "@/utils/email";

/**
 * A marca de quem desenvolveu o sistema (Sauberlich System) em todas as telas, nos e-mails e nos PDFs.
 * Se for retirada de algum desses lugares, este teste falha.
 */
const source = (file: string) => fs.readFileSync(path.join(__dirname, "..", "..", file), "utf8");

describe("marca Sauberlich System", () => {
  it("o texto é o combinado", () => {
    expect(SAUBERLICH_CREDIT).toBe("Desenvolvido por Sauberlich System");
    expect(sauberlichCopyright(2026)).toBe("© 2026 Sauberlich System · Todos os direitos reservados");
  });

  it("todo e-mail montado por modelo leva a marca, com ou sem layout", () => {
    const template = { subject: "Chamado {os}", body: "Olá, {user}." };
    expect(renderEmailTemplate(template, null, { os: "1", user: "Ana" }).html).toContain(SAUBERLICH_CREDIT);
    expect(renderEmailTemplate(template, "<html><body>{corpo}</body></html>", { os: "1", user: "Ana" }).html).toMatch(/Sauberlich System<\/p><\/body>/);
    expect(renderEmailTemplate(template, "<div>{corpo}</div>", { os: "1", user: "Ana" }).html).toContain(SAUBERLICH_CREDIT);
  });

  it("login com o direito autoral e menu de todas as páginas com Desenvolvido por", () => {
    expect(source("src/pages/Login.tsx")).toContain("{sauberlichCopyright()}");
    expect(source("src/components/Sidebar.tsx")).toContain('{collapsed ? "SS" : SAUBERLICH_CREDIT}');
  });

  it("os PDFs exportados levam a marca em cada página", () => {
    for (const file of ["src/pages/Acompanhamento.tsx", "src/pages/Reports.tsx"]) {
      expect(source(file), file).toContain('doc.text(SAUBERLICH_CREDIT, pageWidth / 2, footerY, { align: "center" });');
    }
  });

  it("os e-mails das funções do servidor (nova senha e relatório agendado) também", () => {
    expect(source("supabase/functions/forgot-password/index.ts")).toContain("Desenvolvido por Sauberlich System");
    expect(source("supabase/functions/relatorio-agendado/index.ts")).toContain("Desenvolvido por Sauberlich System");
  });
});
