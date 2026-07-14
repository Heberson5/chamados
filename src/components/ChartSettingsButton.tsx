import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ChartSetting, ChartType, LegendPosition } from "@/lib/chartSettings";
import { usePermissions } from "@/hooks/usePermissions";

const TYPE_LABELS: Record<ChartType, string> = {
  pizza: "Pizza",
  rosca: "Rosca",
  barras: "Barras",
  linha: "Linha",
  area: "Área",
};

const LEGEND_LABELS: Record<LegendPosition, string> = {
  automatica: "Automática",
  interna: "Interna",
  externa: "Externa",
};

interface Props {
  value: Required<ChartSetting>;
  allowedTypes: ChartType[];
  onChange: (patch: ChartSetting) => void;
}

export default function ChartSettingsButton({ value, allowedTypes, onChange }: Props) {
  const { isMaster } = usePermissions();
  if (!isMaster) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          title="Personalizar gráfico"
        >
          <Settings2 size={15} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="end">
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo de gráfico</Label>
          <Select value={value.type} onValueChange={(v) => onChange({ type: v as ChartType })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {allowedTypes.map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cor</Label>
          <input
            type="color"
            value={value.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-8 w-full rounded-md border cursor-pointer bg-transparent"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Posição da legenda</Label>
          <Select value={value.legend} onValueChange={(v) => onChange({ legend: v as LegendPosition })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(LEGEND_LABELS) as LegendPosition[]).map((l) => (
                <SelectItem key={l} value={l}>{LEGEND_LABELS[l]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
