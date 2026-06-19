import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOnlineUsers() {
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase.channel("online-users", { config: { presence: { key: "" } } });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as Record<string, { user_id: string }[]>;
      const ids = new Set<string>();
      Object.values(state).forEach(arr => arr.forEach(p => p.user_id && ids.add(p.user_id)));
      setOnline(ids);
    });
    channel.subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return online;
}