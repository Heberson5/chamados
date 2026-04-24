import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const defaultColumns = [
  { id: "open", label: "Aberto", color: "bg-status-open" },
  { id: "in_progress", label: "Em andamento", color: "bg-status-progress" },
  { id: "waiting", label: "Aguardando", color: "bg-status-waiting" },
  { id: "resolved", label: "Resolvido", color: "bg-status-resolved" },
  { id: "closed", label: "Fechado", color: "bg-muted" },
];

export const useKanbanSettings = () => {
  const { profile, org } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["kanban_settings", profile?.id, org?.id],
    queryFn: async () => {
      if (!profile?.id || !org?.id) return { columns: defaultColumns };
      const { data } = await supabase
        .from("kanban_settings")
        .select("*")
        .eq("user_id", profile.id)
        .eq("organization_id", org.id)
        .maybeSingle();
      
       const config = data?.config as any;
 
       if (!config) return { columns: defaultColumns };
       
       // Migration for old config format if any
       if (!config.columns && config.columnColors) {
         const columns = defaultColumns.map(col => ({
           ...col,
           color: config.columnColors[col.id] || col.color
         }));
         return { columns };
       }
 
       return config || { columns: defaultColumns };
    },
    enabled: !!profile?.id,
  });

  const mutation = useMutation({
    mutationFn: async (config: any) => {
      if (!org?.id) return;
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

   const getStatusLabel = (status: string) => {
     const columns = (query.data?.columns as any[]) || defaultColumns;
     const col = columns.find(c => c.id === status);
     return col ? col.label : status;
   };
 
   const getStatusColor = (status: string) => {
     const columns = (query.data?.columns as any[]) || defaultColumns;
     const col = columns.find(c => c.id === status);
     return col ? col.color : "bg-muted";
   };
 
   return { 
     ...query, 
     updateSettings: mutation.mutate,
     getStatusLabel,
     getStatusColor,
     columns: (query.data?.columns as any[]) || defaultColumns
   };
};
