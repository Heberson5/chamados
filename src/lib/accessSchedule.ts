import { supabase } from "@/integrations/supabase/client";

export interface DaySchedule {
  enabled?: boolean;
  start?: string;
  end?: string;
}

export interface AccessSchedule {
  enabled?: boolean;
  // Legacy fields (kept for backward compatibility)
  days?: number[];
  start?: string;
  end?: string;
  // New per-day map: keys "0".."6" (0=Sun..6=Sat)
  perDay?: Record<string, DaySchedule>;
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
  endMinutesFromNow: number | null;
}

function getDayConfig(sched: AccessSchedule, day: number): DaySchedule | null {
  // New per-day format takes precedence
  if (sched.perDay && sched.perDay[String(day)]) {
    return sched.perDay[String(day)];
  }
  // Legacy: same start/end for all listed days
  if (sched.days && Array.isArray(sched.days)) {
    if (sched.days.includes(day)) {
      return { enabled: true, start: sched.start, end: sched.end };
    }
    return { enabled: false };
  }
  return null;
}

export function evaluateSchedule(sched: AccessSchedule | null | undefined, now = new Date()): ScheduleStatus {
  if (!sched?.enabled) return { hasSchedule: false, allowed: true, endMinutesFromNow: null };
  const day = now.getDay();
  const cur = now.getHours() * 60 + now.getMinutes();
  const cfg = getDayConfig(sched, day);
  if (!cfg || !cfg.enabled) {
    return { hasSchedule: true, allowed: false, endMinutesFromNow: 0 };
  }
  const start = parseHM(cfg.start) ?? 0;
  const end = parseHM(cfg.end) ?? 24 * 60;
  const allowed = cur >= start && cur < end;
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