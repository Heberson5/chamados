import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Listener = (ids: Set<string>) => void;

let sharedChannel: ReturnType<typeof supabase.channel> | null = null;
let currentIds: Set<string> = new Set();
const listeners = new Set<Listener>();
let refCount = 0;

function ensureChannel(userId: string | null) {
  if (sharedChannel) return sharedChannel;
  try {
    const ch = supabase.channel("online-users", {
      config: { presence: { key: userId || crypto.randomUUID() } },
    });
    ch.on("presence", { event: "sync" }, () => {
      try {
        const state = ch.presenceState() as Record<string, { user_id?: string }[]>;
        const ids = new Set<string>();
        Object.values(state).forEach((arr) =>
          arr.forEach((p) => p.user_id && ids.add(p.user_id))
        );
        currentIds = ids;
        listeners.forEach((l) => {
          try { l(ids); } catch (e) { console.warn("presence listener error", e); }
        });
      } catch (e) { console.warn("presence sync error", e); }
    }).subscribe(async (status) => {
      try {
        if (status === "SUBSCRIBED" && userId) {
          await ch.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      } catch (e) { console.warn("presence track error", e); }
    });
    sharedChannel = ch;
    return ch;
  } catch (e) {
    console.warn("ensureChannel failed", e);
    return null;
  }
}

export function useOnlineUsers() {
  const [online, setOnline] = useState<Set<string>>(currentIds);

  useEffect(() => {
    let cancelled = false;
    refCount++;
    const listener: Listener = (ids) => setOnline(ids);
    listeners.add(listener);

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      ensureChannel(user?.id ?? null);
    })();

    return () => {
      cancelled = true;
      listeners.delete(listener);
      refCount--;
      if (refCount === 0 && sharedChannel) {
        supabase.removeChannel(sharedChannel);
        sharedChannel = null;
        currentIds = new Set();
      }
    };
  }, []);

  return online;
}