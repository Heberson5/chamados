import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useKanbanSettings = () => {
  const { profile, org } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["kanban_settings", profile?.id, org?.id],
    queryFn: async () => {
      if (!profile?.id || !org?.id) return null;
      const { data } = await supabase
        .from("kanban_settings")
        .select("*")
        .eq("user_id", profile.id)
        .eq("organization_id", org.id)
        .maybeSingle();
      
      return data?.config || {
        columnColors: {
          open: "bg-status-open",
          in_progress: "bg-status-progress",
          resolved: "bg-status-resolved",
          closed: "bg-status-closed",
          pending: "bg-status-pending"
        }
      };
    },
    enabled: !!profile?.id && !!org?.id,
  });

  const mutation = useMutation({
    mutationFn: async (config: any) => {
      const { error } = await supabase
        .from("kanban_settings")
        .upsert({
          user_id: profile?.id,
          organization_id: org?.id,
          config,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,organization_id" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban_settings"] });
    },
  });

  return { ...query, updateSettings: mutation.mutate };
};
