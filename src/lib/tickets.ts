/* Regras de exibição de chamados (SLA, durações, tempo relativo). */

interface StatusRowLike {
  is_pausa?: boolean;
  is_encerrado?: boolean;
  is_cancelado?: boolean;
}

export function formatDuration(totalMinutes: number) {
  const m = Math.max(0, Math.round(totalMinutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h < 24) return rest ? `${h}h ${rest}min` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

export interface SlaTicket {
  sla_deadline?: string | null;
  sla_violado?: boolean | null;
  encerrado_em?: string | null;
}

export type SlaState = "ok" | "warn" | "bad" | "neutral";

export function getSlaInfo(ticket: SlaTicket, status?: StatusRowLike, now = Date.now()): { state: SlaState; label: string; rank: number } {
  if (status?.is_cancelado) return { state: "neutral", label: "Cancelado", rank: 5 };
  if (status?.is_encerrado || ticket.encerrado_em) {
    if (!ticket.sla_deadline) return { state: "neutral", label: "Encerrado", rank: 5 };
    const late = ticket.encerrado_em && new Date(ticket.encerrado_em).getTime() > new Date(ticket.sla_deadline).getTime();
    return late || ticket.sla_violado
      ? { state: "neutral", label: "Fora do SLA", rank: 4 }
      : { state: "ok", label: "Dentro do SLA", rank: 4 };
  }
  if (status?.is_pausa) return { state: "neutral", label: "SLA pausado", rank: 3 };
  if (!ticket.sla_deadline) return { state: "neutral", label: "Sem SLA", rank: 3 };
  const diffMin = (new Date(ticket.sla_deadline).getTime() - now) / 60000;
  if (diffMin < 0) return { state: "bad", label: `Vencido há ${formatDuration(-diffMin)}`, rank: 0 };
  if (diffMin < 60) return { state: "warn", label: `Vence em ${formatDuration(diffMin)}`, rank: 1 };
  return { state: "ok", label: formatDuration(diffMin), rank: 2 };
}

export function initialsOf(nome?: string | null, sobrenome?: string | null) {
  const a = (nome || "").trim()[0] || "";
  const b = (sobrenome || "").trim()[0] || ((nome || "").trim().split(/\s+/)[1] || "")[0] || "";
  return (a + b).toUpperCase() || "?";
}

/** Tempo relativo curto: "agora", "há 12 min", "há 3h", "ontem", "há 4 dias", "12/03". */
export function timeAgo(date: string | Date | null | undefined, now = Date.now()) {
  if (!date) return "—";
  const d = new Date(date);
  const min = Math.floor((now - d.getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: days > 300 ? "2-digit" : undefined });
}
