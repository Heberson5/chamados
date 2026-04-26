import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BrandingSettings {
  companyName?: string;
  companyLogo?: string;
  companyFavicon?: string;
  accentColor?: string;
  sidebarColor?: string;
  menuOrder?: any[];
}

interface BrandingContextValue {
  branding: BrandingSettings;
  reload: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: {},
  reload: async () => {},
});

function hexToHsl(hex: string): string | null {
  const m = hex.replace("#", "").match(/^([\da-f]{6})$/i);
  if (!m) return null;
  const num = parseInt(m[1], 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyBrandingSideEffects(settings: BrandingSettings) {
  if (settings.companyName) {
    document.title = settings.companyName;
  }
  if (settings.companyFavicon) {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = settings.companyFavicon;
  }
  if (settings.accentColor) {
    const hsl = hexToHsl(settings.accentColor);
    if (hsl) {
      document.documentElement.style.setProperty("--primary", hsl);
    }
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings>({});

  const load = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "layout_settings")
      .maybeSingle();
    if (data?.value) {
      const val = data.value as BrandingSettings;
      setBranding(val);
      applyBrandingSideEffects(val);
    }
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel("branding-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "system_settings",
          filter: "key=eq.layout_settings",
        },
        (payload: any) => {
          const val = (payload.new?.value ?? payload.record?.value) as BrandingSettings | undefined;
          if (val) {
            setBranding(val);
            applyBrandingSideEffects(val);
          } else {
            load();
          }
        }
      )
      .subscribe();

    // Hide Lovable badge style (preserved alternative approach)
    const style = document.createElement("style");
    style.innerHTML = `
      #lovable-badge,
      .lovable-badge,
      [href*="lovable.dev"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, reload: load }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
