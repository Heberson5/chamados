import { describe, expect, it } from "vitest";
import { SAUBERLICH_EMAIL_FOOTER } from "@/lib/marca";
import { renderEmailTemplate } from "./email";

describe("renderEmailTemplate", () => {
  it("substitui tags, aplica o layout e quebra linhas", () => {
    const r = renderEmailTemplate(
      { subject: "Chamado #{os}", body: "Olá {user}\nStatus: {status}" },
      "<div class='x'>{corpo}</div>",
      { os: "10", user: "Ana", status: "Aberto" }
    );
    expect(r.subject).toBe("Chamado #10");
    // ...e termina com a marca de quem desenvolveu o sistema.
    expect(r.html).toBe("<div class='x'>Olá Ana<br>Status: Aberto</div>" + SAUBERLICH_EMAIL_FOOTER);
  });

  it("escapa HTML vindo dos dados do chamado", () => {
    const r = renderEmailTemplate({ subject: "s", body: "{comentario}" }, "", { comentario: '<img src=x onerror="alert(1)">' });
    expect(r.html).not.toContain("<img");
    expect(r.html).toContain("&lt;img");
  });
});
