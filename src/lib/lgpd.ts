/* Rótulos e utilitários de LGPD compartilhados entre Perfil e Privacidade. */

export const SOLICITACAO_TIPOS: { value: string; label: string; hint: string }[] = [
  { value: "acesso", label: "Acesso aos meus dados", hint: "Receber uma cópia dos dados pessoais que o sistema guarda sobre você." },
  { value: "correcao", label: "Correção de dados", hint: "Dados incompletos, inexatos ou desatualizados." },
  { value: "anonimizacao", label: "Anonimização", hint: "Remover o que identifica você, mantendo o histórico dos chamados." },
  { value: "exclusao", label: "Eliminação de dados", hint: "Apagar dados tratados com base no seu consentimento." },
  { value: "portabilidade", label: "Portabilidade", hint: "Receber seus dados em formato estruturado para levar a outro serviço." },
  { value: "informacao_compartilhamento", label: "Com quem meus dados são compartilhados", hint: "Saber quais entidades recebem seus dados." },
  { value: "confirmacao", label: "Confirmar se há tratamento", hint: "Saber se a empresa trata seus dados pessoais." },
  { value: "revogacao_consentimento", label: "Revogar consentimento", hint: "Retirar um consentimento dado anteriormente." },
  { value: "oposicao", label: "Oposição ao tratamento", hint: "Opor-se a um tratamento que você considera irregular." },
];

export const tipoLabel = (v: string) => SOLICITACAO_TIPOS.find((t) => t.value === v)?.label ?? v;

export const SOLICITACAO_STATUS: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  em_andamento: { label: "Em andamento", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  concluida: { label: "Concluída", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  recusada: { label: "Recusada", cls: "bg-muted text-muted-foreground border-border" },
};

export const RECURSO_LABEL: Record<string, string> = {
  anexo: "Abriu um anexo",
  perfil: "Abriu o cadastro",
  contato: "Viu o contato completo",
  chamado_sensivel: "Abriu chamado com dado sensível",
  exportacao: "Exportou dados",
};

export function maskEmail(email?: string | null) {
  if (!email) return "—";
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}${"•".repeat(Math.max(2, user.length - visible.length))}@${domain}`;
}

export function maskPhone(phone?: string | null) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `(••) •••••-${digits.slice(-4)}`;
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Dias úteis entre duas datas (para o prazo de comunicação de incidente). */
export function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return d;
}
