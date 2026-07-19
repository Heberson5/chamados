import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChamadoStatus {
  id: string;
  key: string;
  label: string;
  cor: string;
  ordem: number;
  is_inicial: boolean;
  is_pausa: boolean;
  is_encerrado: boolean;
  is_cancelado: boolean;
  legacy_enum: string | null;
  ativo: boolean;
}

type StatusFlag = "is_inicial" | "is_pausa" | "is_encerrado" | "is_cancelado";

interface TicketLike {
  status_id?: string | null;
  status?: string | null;
}

export function useChamadoStatuses() {
  const [statuses, setStatuses] = useState<ChamadoStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatuses = useCallback(async () => {
    const { data } = await supabase
      .from("chamado_statuses")
      .select("*")
      .eq("ativo", true)
      .order("ordem", { ascending: true });
    if (data) setStatuses(data as ChamadoStatus[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatuses();

    const channel = supabase
      .channel("chamado-statuses-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chamado_statuses" },
        () => fetchStatuses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStatuses]);

  const getStatusRow = useCallback(
    (ticket: TicketLike | null | undefined): ChamadoStatus | undefined => {
      if (!ticket) return undefined;
      if (ticket.status_id) {
        const byId = statuses.find((s) => s.id === ticket.status_id);
        if (byId) return byId;
      }
      if (ticket.status) {
        return statuses.find((s) => s.legacy_enum === ticket.status);
      }
      return undefined;
    },
    [statuses]
  );

  const getLabel = useCallback(
    (ticket: TicketLike | null | undefined): string => {
      const row = getStatusRow(ticket);
      return row?.label || ticket?.status || "";
    },
    [getStatusRow]
  );

  const isEncerrado = useCallback((ticket: TicketLike | null | undefined) => !!getStatusRow(ticket)?.is_encerrado, [getStatusRow]);
  const isPausa = useCallback((ticket: TicketLike | null | undefined) => !!getStatusRow(ticket)?.is_pausa, [getStatusRow]);
  const isInicial = useCallback((ticket: TicketLike | null | undefined) => !!getStatusRow(ticket)?.is_inicial, [getStatusRow]);
  const isCancelado = useCallback((ticket: TicketLike | null | undefined) => !!getStatusRow(ticket)?.is_cancelado, [getStatusRow]);

  const getStatusIdByFlag = useCallback(
    (flag: StatusFlag): string | undefined => statuses.find((s) => s[flag])?.id,
    [statuses]
  );

  const getStatusIdByLegacyEnum = useCallback(
    (legacyEnum: string): string | undefined => statuses.find((s) => s.legacy_enum === legacyEnum)?.id,
    [statuses]
  );

  return {
    statuses,
    loading,
    getStatusRow,
    getLabel,
    isEncerrado,
    isPausa,
    isInicial,
    isCancelado,
    getStatusIdByFlag,
    getStatusIdByLegacyEnum,
  };
}
