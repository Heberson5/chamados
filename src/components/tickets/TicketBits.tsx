import { CheckCircle2, Pause, Timer, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPriorityLabel } from "@/lib/utils/priority";
import { getSlaInfo, initialsOf, type SlaTicket } from "@/lib/tickets";

/* Peças visuais compartilhadas por Lista, Kanban, Detalhe e Painel. */

interface StatusRowLike {
  label?: string;
  cor?: string | null;
  is_pausa?: boolean;
  is_encerrado?: boolean;
  is_cancelado?: boolean;
}

export function StatusPill({ status, label, className }: { status?: StatusRowLike; label?: string; className?: string }) {
  const color = status?.cor || "#64748b";
  return (
    <span
      className={cn("pill", className)}
      style={{ color, backgroundColor: `${color}14`, borderColor: `${color}33` }}
    >
      <span className="pill-dot" />
      {label ?? status?.label ?? "—"}
    </span>
  );
}

interface PriorityLike {
  nome?: string;
  cor?: string;
  ordem?: number;
}

function priorityLevel(p?: PriorityLike | null, legacy?: string | null) {
  const name = (p?.nome || getPriorityLabel(legacy || "") || "").toLowerCase();
  if (/cr[ií]tic|urgent/.test(name)) return 4;
  if (/alt|high/.test(name)) return 3;
  if (/m[ée]di|normal|medium/.test(name)) return 2;
  if (/baix|low/.test(name)) return 1;
  if (p?.ordem != null) return Math.max(1, 4 - (p.ordem - 1));
  return 2;
}

/** Prioridade em formato de "barrinhas de sinal" (mais barras = mais urgente). */
export function PriorityIndicator({
  priority,
  legacy,
  showLabel = true,
  className,
}: {
  priority?: PriorityLike | null;
  legacy?: string | null;
  showLabel?: boolean;
  className?: string;
}) {
  const level = priorityLevel(priority, legacy);
  const color = priority?.cor || (level >= 4 ? "#e5484d" : level === 3 ? "#f76b15" : level === 2 ? "#3b82f6" : "#8b8fa3");
  const filled = Math.min(3, level);
  const label = priority?.nome || getPriorityLabel(legacy || "") || "—";
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap", className)}
      style={level >= 4 ? { color } : undefined}
      title={`Prioridade: ${label}`}
    >
      <span className="inline-flex items-end gap-[1.5px] h-[11px]" aria-hidden="true">
        {[5, 8, 11].map((h, i) => (
          <span
            key={h}
            className="w-[3px] rounded-[1px] bg-border"
            style={{ height: h, backgroundColor: i < filled ? color : undefined }}
          />
        ))}
      </span>
      {showLabel && <span className={level >= 4 ? "" : "text-foreground/80"}>{label}</span>}
    </span>
  );
}

export function SlaChip({ ticket, status, className }: { ticket: SlaTicket; status?: StatusRowLike; className?: string }) {
  const info = getSlaInfo(ticket, status);
  const Icon = status?.is_pausa ? Pause : status?.is_cancelado ? XCircle : info.state === "ok" && status?.is_encerrado ? CheckCircle2 : Timer;
  return (
    <span
      className={cn(
        "sla-chip",
        info.state === "ok" && "sla-ok",
        info.state === "warn" && "sla-warn",
        info.state === "bad" && "sla-bad",
        info.state === "neutral" && "sla-neutral",
        className
      )}
      title={ticket.sla_deadline ? `Prazo: ${new Date(ticket.sla_deadline).toLocaleString("pt-BR")}` : undefined}
    >
      <Icon size={12} />
      {info.label}
    </span>
  );
}

const AVATAR_COLORS = ["#7c6cff", "#f97316", "#0ea5e9", "#10b981", "#ec4899", "#64748b", "#eab308", "#14b8a6"];

export function UserAvatar({
  person,
  size = 24,
  className,
}: {
  person?: { nome?: string | null; sobrenome?: string | null; avatar_url?: string | null } | null;
  size?: number;
  className?: string;
}) {
  const name = `${person?.nome || ""} ${person?.sobrenome || ""}`.trim();
  const seed = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const bg = AVATAR_COLORS[seed % AVATAR_COLORS.length];
  return (
    <span
      className={cn("inline-grid place-items-center rounded-full text-white font-bold shrink-0 overflow-hidden ring-2 ring-card", className)}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.4), backgroundColor: person ? bg : undefined }}
      title={name || undefined}
    >
      {person?.avatar_url ? (
        <img src={person.avatar_url} alt={name} className="h-full w-full object-cover" />
      ) : (
        initialsOf(person?.nome, person?.sobrenome)
      )}
    </span>
  );
}

