export const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting: "Aguardando",
  resolved: "Resolvido",
  closed: "Fechado",
};

export const STATUS_ORDER = ["open", "in_progress", "waiting", "resolved", "closed"] as const;

export const STATUS_DOT: Record<string, string> = {
  open: "bg-status-open",
  in_progress: "bg-status-progress",
  waiting: "bg-status-waiting",
  resolved: "bg-status-resolved",
  closed: "bg-status-closed",
};

export const PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

export const PRIORITY_DOT: Record<string, string> = {
  low: "bg-priority-low",
  medium: "bg-priority-medium",
  high: "bg-priority-high",
  urgent: "bg-priority-urgent",
};

export function timeAgo(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "agora";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("pt-BR");
}