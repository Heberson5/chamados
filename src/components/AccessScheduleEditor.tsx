import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

import type { AccessSchedule, DaySchedule } from "@/lib/accessSchedule";
export type { AccessSchedule } from "@/lib/accessSchedule";

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface Props {
  value: AccessSchedule | null | undefined;
  onChange: (v: AccessSchedule | null) => void;
}

function normalize(value: AccessSchedule | null | undefined): AccessSchedule {
  // Convert legacy format to perDay
  if (value?.perDay) return { enabled: !!value.enabled, perDay: value.perDay };
  const perDay: Record<string, DaySchedule> = {};
  for (let i = 0; i < 7; i++) {
    const enabledDay = !!value && Array.isArray(value.days) && value.days.includes(i);
    perDay[String(i)] = {
      enabled: enabledDay || (i >= 1 && i <= 5 && !value),
      start: value?.start || (i === 6 ? "07:30" : "08:00"),
      end: value?.end || (i === 6 ? "11:30" : "18:00"),
    };
  }
  return { enabled: !!value?.enabled, perDay };
}

export default function AccessScheduleEditor({ value, onChange }: Props) {
  const sched = normalize(value);
  const update = (patch: Partial<AccessSchedule>) => onChange({ ...sched, ...patch });

  const updateDay = (d: number, patch: Partial<DaySchedule>) => {
    const perDay = { ...(sched.perDay || {}) };
    perDay[String(d)] = { ...(perDay[String(d)] || {}), ...patch };
    update({ perDay });
  };

  const copyToAll = (d: number) => {
    const src = sched.perDay?.[String(d)];
    if (!src) return;
    const perDay: Record<string, DaySchedule> = {};
    for (let i = 0; i < 7; i++) {
      perDay[String(i)] = { ...src };
    }
    update({ perDay });
  };

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-muted/10">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-semibold">Restringir horário de acesso</Label>
          <p className="text-[10px] text-muted-foreground">Cada dia da semana pode ter seu próprio horário.</p>
        </div>
        <Switch checked={!!sched.enabled} onCheckedChange={v => update({ enabled: v })} />
      </div>
      {sched.enabled && (
        <div className="space-y-2">
          {DAY_NAMES.map((name, i) => {
            const day = sched.perDay?.[String(i)] || { enabled: false, start: "08:00", end: "18:00" };
            return (
              <div key={i} className="flex items-center gap-2 border rounded p-2 bg-background">
                <Switch
                  checked={!!day.enabled}
                  onCheckedChange={v => updateDay(i, { enabled: v })}
                />
                <span className="text-xs font-semibold w-10">{name}</span>
                <Input
                  type="time"
                  value={day.start || "08:00"}
                  disabled={!day.enabled}
                  onChange={e => updateDay(i, { start: e.target.value })}
                  className="h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground">às</span>
                <Input
                  type="time"
                  value={day.end || "18:00"}
                  disabled={!day.enabled}
                  onChange={e => updateDay(i, { end: e.target.value })}
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  title="Copiar este horário para todos os dias"
                  onClick={() => copyToAll(i)}
                >
                  <Copy size={12} />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}