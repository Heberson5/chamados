import { supabase } from "@/integrations/supabase/client";

export type ChartType = "pizza" | "rosca" | "barras" | "linha" | "area";
export type LegendPosition = "automatica" | "interna" | "externa";

export interface ChartSetting {
  type?: ChartType;
  color?: string;
  legend?: LegendPosition;
}

export type ChartSettingsMap = Record<string, ChartSetting>;

const SETTINGS_KEY = "chart_settings";

export async function fetchChartSettings(): Promise<ChartSettingsMap> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  return (data?.value as ChartSettingsMap) || {};
}

export async function saveChartSetting(
  chartKey: string,
  patch: ChartSetting
): Promise<ChartSettingsMap> {
  const current = await fetchChartSettings();
  const next: ChartSettingsMap = {
    ...current,
    [chartKey]: { ...current[chartKey], ...patch },
  };
  const { error } = await supabase
    .from("system_settings")
    .upsert({ key: SETTINGS_KEY, value: next as any }, { onConflict: "key" });
  if (error) throw error;
  return next;
}
