import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSystemSettings = () => {
  return useQuery({
    queryKey: ["system_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("id", "00000000-0000-0000-0000-000000000000")
        .maybeSingle();
      
      if (error) throw error;
      return data || {
        system_name: "Global System",
        logo_url: null,
         favicon_url: null,
         primary_color: "#3b82f6",
         menu_config: [],
         landing_page_config: {}
      };
    },
  });
};
