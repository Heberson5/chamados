/**
 * Marca de quem desenvolveu o sistema — Sauberlich System. Fica fixa no código, fora das Configurações
 * (o layout e a identidade do sistema mudam, esta marca não): "Desenvolvido por" no menu de todas as
 * páginas, nos e-mails e nos PDFs; o direito autoral no login. O teste src/test/marca.test.ts falha se
 * ela for retirada de algum desses lugares.
 */
export const SAUBERLICH_CREDIT = "Desenvolvido por Sauberlich System";
export function sauberlichCopyright(year: number = new Date().getFullYear()): string {
  return `© ${year} Sauberlich System · Todos os direitos reservados`;
}
/** O rodapé dos e-mails (HTML). */
export const SAUBERLICH_EMAIL_FOOTER = `<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#b4bac1;text-align:center">${SAUBERLICH_CREDIT}</p>`;
