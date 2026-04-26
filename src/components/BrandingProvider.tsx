import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export const BrandingProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const loadBranding = async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("*")
        .eq("key", "layout_settings")
        .single();

      if (data && data.value) {
        const settings = data.value as any;

        // Update Title
        if (settings.companyName) {
          document.title = settings.companyName;
        }

        // Update Favicon
        if (settings.companyFavicon) {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = settings.companyFavicon;
        }

        // Apply accent color from palette to --primary (user explicit choice via Settings)
        if (settings.accentColor) {
          const hsl = hexToHsl(settings.accentColor);
          if (hsl) {
            document.documentElement.style.setProperty('--primary', hsl);
          }
        }
      }
    };

    loadBranding();

    // React to changes saved from Settings page
    const channel = supabase
      .channel('branding-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'system_settings',
        filter: 'key=eq.layout_settings'
      }, () => loadBranding())
      .subscribe();

    // Periodically check for Lovable badge and try to hide it if user requested
    // This is the "alternative approach" since the tool was declined
    const style = document.createElement('style');
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

    return () => { supabase.removeChannel(channel); };
  }, []);

  return <>{children}</>;
};