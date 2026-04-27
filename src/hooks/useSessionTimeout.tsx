import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export function useSessionTimeout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    toast({
      title: "Sessão expirada",
      description: "Você foi desconectado por inatividade.",
      variant: "destructive",
    });
    navigate("/login");
  }, [navigate, toast]);

  const resetTimer = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Fetch timeout from settings
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "session_timeout")
      .maybeSingle();
    
    // Default to 300 minutes (5 hours) if not set
    const timeoutMinutes = data?.value ? parseInt(data.value as string) : 300;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    timeoutRef.current = setTimeout(logout, timeoutMs);
  }, [logout]);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Initial start
    resetTimer();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer]);

  return { resetTimer };
}
