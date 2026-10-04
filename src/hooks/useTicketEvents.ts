import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type TicketEvent = Tables<"chamado_eventos"> & { ator?: { nome?: string | null; sobrenome?: string | null } | null };

/** Histórico de eventos do chamado (com atualização em tempo real). */
export function useTicketEvents(ticketId: string | null | undefined, enabled: boolean) {
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const load = useCallback(async () => {
    if (!ticketId) return;
    const { data } = await supabase
      .from("chamado_eventos")
      .select("*, ator:profiles!chamado_eventos_ator_id_fkey(nome, sobrenome)")
      .eq("chamado_id", ticketId)
      .order("criado_em", { ascending: true });
    if (data) {
      setEvents(data as unknown as TicketEvent[]);
      return;
    }
    // Sem FK para profiles (ator pode ser o sistema): busca simples.
    const { data: plain } = await supabase.from("chamado_eventos").select("*").eq("chamado_id", ticketId).order("criado_em", { ascending: true });
    setEvents((plain ?? []) as TicketEvent[]);
  }, [ticketId]);

  useEffect(() => {
    if (!enabled || !ticketId) return;
    load();
    const channel = supabase
      .channel(`eventos-${ticketId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chamado_eventos", filter: `chamado_id=eq.${ticketId}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, ticketId, load]);

  return events;
}

