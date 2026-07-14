import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchChartSettings,
  saveChartSetting,
  type ChartSetting,
  type ChartSettingsMap,
} from "@/lib/chartSettings";

export function useChartSettings() {
  const [settings, setSettings] = useState<ChartSettingsMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartSettings().then((data) => {
      setSettings(data);
      setLoading(false);
    });

    const channel = supabase
      .channel("chart-settings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "system_settings",
          filter: "key=eq.chart_settings",
        },
        (payload: any) => {
          const val = (payload.new?.value ?? payload.record?.value) as ChartSettingsMap | undefined;
          if (val) setSettings(val);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getSetting = useCallback(
    (chartKey: string, defaults: Required<ChartSetting>): Required<ChartSetting> => ({
      ...defaults,
      ...settings[chartKey],
    }),
    [settings]
  );

  const updateSetting = useCallback(async (chartKey: string, patch: ChartSetting) => {
    const next = await saveChartSetting(chartKey, patch);
    setSettings(next);
  }, []);

  return { settings, loading, getSetting, updateSetting };
}
