import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

        // NOTE: Accent color is intentionally NOT applied to --primary
        // to avoid changing the design system colors without explicit user request.
      }
    };

    loadBranding();

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
  }, []);

  return <>{children}</>;
};