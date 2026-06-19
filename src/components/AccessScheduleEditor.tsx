import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AccessSchedule {
  enabled?: boolean;
  days?: number[]; // 0=Sun..6=Sat
  start?: string;  // 'HH:MM'
  end?: string;
}

const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface Props {
  value: AccessSchedule | null | undefined;
  onChange: (v: AccessSchedule | null) => void;
}

export default function AccessScheduleEditor({ value, onChange }: Props) {
  const sched: AccessSchedule = value || { enabled: false, days: [1,2,3,4,5], start: "08:00", end: "18:00" };
  const update = (patch: Partial<AccessSchedule>) => onChange({ ...sched, ...patch });

  const toggleDay = (d: number) => {
    const days = sched.days || [];
    update({ days: days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort() });
  };

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-muted/10">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-semibold">Restringir horário de acesso</Label>
          <p className="text-[10px] text-muted-foreground">Bloqueia o login fora do horário definido.</p>
        </div>
        <Switch checked={!!sched.enabled} onCheckedChange={v => update({ enabled: v })} />
      </div>
      {sched.enabled && (
        <>
          <div className="flex gap-1">
            {DAYS.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                title={DAY_NAMES[i]}
                className={`flex-1 h-8 rounded text-xs font-bold border ${(sched.days || []).includes(i) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground'}`}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Início</Label>
              <Input type="time" value={sched.start || "08:00"} onChange={e => update({ start: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fim</Label>
              <Input type="time" value={sched.end || "18:00"} onChange={e => update({ end: e.target.value })} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}