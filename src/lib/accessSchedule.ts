import { supabase } from "@/integrations/supabase/client";

export interface AccessSchedule {
  enabled?: boolean;
  days?: number[];
  start?: string;
  end?: string;
}

export function parseHM(s?: string) {
  if (!s) return null;
  const [h, m] = s.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

export interface ScheduleStatus {
  hasSchedule: boolean;
  allowed: boolean;
  endMinutesFromNow: number | null; // minutes until end-of-day, null if no schedule
}

export function evaluateSchedule(sched: AccessSchedule | null | undefined, now = new Date()): ScheduleStatus {
  if (!sched?.enabled) return { hasSchedule: false, allowed: true, endMinutesFromNow: null };
  const day = now.getDay();
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = parseHM(sched.start) ?? 0;
  const end = parseHM(sched.end) ?? 24 * 60;
  const dayOk = (sched.days || []).includes(day);
  const allowed = dayOk && cur >= start && cur < end;
  const remaining = allowed ? end - cur : 0;
  return { hasSchedule: true, allowed, endMinutesFromNow: remaining };
}

export async function loadEffectiveSchedule(userId: string): Promise<AccessSchedule | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("access_schedule, department_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;
  const own = profile.access_schedule as AccessSchedule | null;
  if (own?.enabled) return own;
  if (profile.department_id) {
    const { data: dept } = await supabase
      .from("departamentos")
      .select("access_schedule")
      .eq("id", profile.department_id)
      .maybeSingle();
    if (dept?.access_schedule) return dept.access_schedule as AccessSchedule;
  }
  return own;
}