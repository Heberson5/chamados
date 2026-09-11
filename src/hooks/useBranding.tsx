import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BrandingSettings {
  companyName?: string;
  companyLogo?: string;
  companyFavicon?: string;
  accentColor?: string;
  sidebarColor?: string;
  menuOrder?: any[];
  appName?: string;
  appIcon?: string;
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

const BRANDING_CACHE_KEY = "chamados_branding_cache";

let lastManifestBlobUrl: string | null = null;

// Gera um manifest.json dinâmico com o ícone/nome configurados em
// Configurações > Layout e troca o <link rel="manifest">, para que o
// "Instalar aplicativo" do Android/Chrome use a marca do cliente em vez do
// manifest estático padrão. No iOS não existe manifest — lá quem manda são
// os metatags apple-* atualizados logo abaixo.
function applyPwaManifest(settings: BrandingSettings) {
  const name = settings.appName || settings.companyName || "Chamados";
  const icon = settings.appIcon || settings.companyFavicon;

  let link = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "manifest";
    document.head.appendChild(link);
  }

  if (!icon) {
    // Sem ícone customizado: mantém o manifest estático padrão
    // (public/manifest.json), que já tem ícones de fallback.
    if (lastManifestBlobUrl) {
      link.href = "/manifest.json";
      URL.revokeObjectURL(lastManifestBlobUrl);
      lastManifestBlobUrl = null;
    }
    return;
  }

  const manifest = {
    name,
    short_name: name.slice(0, 12),
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: settings.accentColor || "#3b82f6",
    icons: [
      { src: icon, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  link.href = url;
  if (lastManifestBlobUrl) URL.revokeObjectURL(lastManifestBlobUrl);
  lastManifestBlobUrl = url;
}

function setMetaContent(name: string, content: string) {
  let meta = document.querySelector(`meta[name='${name}']`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function applyBrandingSideEffects(settings: BrandingSettings) {
  document.title = settings.companyName || "Chamados";
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

  // PWA: nome/ícone exibidos quando o app é instalado na tela inicial.
  const appIcon = settings.appIcon || settings.companyFavicon;
  if (appIcon) {
    let appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
    if (!appleIcon) {
      appleIcon = document.createElement("link");
      appleIcon.rel = "apple-touch-icon";
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = appIcon;
  }
  setMetaContent("apple-mobile-web-app-title", settings.appName || settings.companyName || "Chamados");
  applyPwaManifest(settings);
  // Cacheia pro próximo carregamento: um script inline no index.html lê isso
  // e aplica o favicon/título ANTES do React montar, pra não piscar o ícone
  // padrão a cada refresh enquanto essa busca no Supabase não termina.
  try {
    localStorage.setItem(
      BRANDING_CACHE_KEY,
      JSON.stringify({ companyName: settings.companyName, companyFavicon: settings.companyFavicon })
    );
  } catch (e) {
    // localStorage indisponível (modo privado, quota etc.) — sem problema,
    // só significa que o próximo carregamento não tem cache.
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

    // Local in-tab fast-path: Settings page dispatches this on save
    const onLocalUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail as BrandingSettings | undefined;
      if (detail) {
        setBranding(detail);
        applyBrandingSideEffects(detail);
      } else {
        load();
      }
    };
    window.addEventListener("branding:updated", onLocalUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("branding:updated", onLocalUpdate);
    };
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, reload: load }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
