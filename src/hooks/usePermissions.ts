import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const usePermissions = (moduleName: string) => {
  const { profile } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["permissions", profile?.department_id, moduleName],
    queryFn: async () => {
      if (!profile?.department_id) return null;
      
      const { data, error } = await supabase
        .from("department_permissions")
        .select("*")
        .eq("department_id", profile.department_id)
        .eq("module_name", moduleName)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.department_id && !!moduleName,
  });

  if (profile?.is_master) {
    return {
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: true,
      isLoading: false
    };
  }

  return {
    can_view: permissions?.can_view ?? false,
    can_create: permissions?.can_create ?? false,
    can_edit: permissions?.can_edit ?? false,
    can_delete: permissions?.can_delete ?? false,
    isLoading
  };
};
