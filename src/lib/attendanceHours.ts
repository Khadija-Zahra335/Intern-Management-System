import { Attendance } from "@/lib/api";

function dayKey(d: Date): string {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD, stable sort/group key
}

/**
 * Work hours per calendar day = (check-in -> check-out) time minus any
 * Lunch/AFK/Relax intervals inside that session. Sums across multiple
 * sessions in a day if they occur. A session still open (no check-out yet,
 * e.g. "today") counts elapsed-so-far minus completed breaks.
 */
export function computeDailyWorkHours(records: Attendance[]): Map<string, number> {
  const sorted = records.slice().sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  const byDay = new Map<string, number>();

  let checkedInAt: Date | null = null;
  let breakStart: Date | null = null;
  let breakMs = 0;
  let dayOfSession = "";

  for (const r of sorted) {
    const t = new Date(r.occurredAt);
    if (r.type === "CHECK_IN") {
      checkedInAt = t;
      breakStart = null;
      breakMs = 0;
      dayOfSession = dayKey(t);
    } else if (r.type === "LUNCH_START" || r.type === "AFK_START" || r.type === "RELAX_START") {
      if (checkedInAt && !breakStart) breakStart = t;
    } else if (r.type === "LUNCH_END" || r.type === "AFK_END" || r.type === "RELAX_END") {
      if (checkedInAt && breakStart) {
        breakMs += t.getTime() - breakStart.getTime();
        breakStart = null;
      }
    } else if (r.type === "CHECK_OUT") {
      if (checkedInAt) {
        const workMs = Math.max(0, t.getTime() - checkedInAt.getTime() - breakMs);
        byDay.set(dayOfSession, (byDay.get(dayOfSession) ?? 0) + workMs / 3_600_000);
      }
      checkedInAt = null;
      breakStart = null;
      breakMs = 0;
    }
  }

  if (checkedInAt) {
    const now = new Date();
    const workMs = Math.max(0, now.getTime() - checkedInAt.getTime() - breakMs);
    byDay.set(dayOfSession, (byDay.get(dayOfSession) ?? 0) + workMs / 3_600_000);
  }

  return byDay;
}

function isWeekday(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

export type HourBar = {
  key: string;
  label: string;
  hours: number;
  goalHours: number;
  isCurrent: boolean;
  hasData: boolean;
};

/** Mon–Fri of the current calendar week. */
export function weekBars(daily: Map<string, number>, now: Date): HourBar[] {
  const bars: HourBar[] = [];
  const dow = now.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dayKey(d);
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
    bars.push({ key, label: labels[i], hours: daily.get(key) ?? 0, goalHours: 8, isCurrent: key === dayKey(now), hasData: dayEnd.getTime() <= new Date().setHours(23, 59, 59, 999) && d <= now });
  }
  return bars;
}

/** Every weekday of the current calendar month, up to today. */
export function monthBars(daily: Map<string, number>, now: Date): HourBar[] {
  const bars: HourBar[] = [];
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    if (!isWeekday(d)) continue;
    const key = dayKey(d);
    bars.push({ key, label: String(day), hours: daily.get(key) ?? 0, goalHours: 8, isCurrent: key === dayKey(now), hasData: d <= now });
  }
  return bars;
}

/** Jan–Dec of the current calendar year, aggregated per month. */
export function yearBars(daily: Map<string, number>, now: Date): HourBar[] {
  const bars: HourBar[] = [];
  const year = now.getFullYear();
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let hours = 0;
    let weekdayCount = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      if (!isWeekday(d)) continue;
      weekdayCount++;
      hours += daily.get(dayKey(d)) ?? 0;
    }
    bars.push({
      key: `${year}-${month}`,
      label: labels[month],
      hours,
      goalHours: weekdayCount * 8,
      isCurrent: month === now.getMonth(),
      hasData: new Date(year, month, 1) <= now,
    });
  }
  return bars;
}

export type SessionState = "OUT" | "IN" | "LUNCH" | "AFK" | "RELAX";

export function deriveAttendanceState(records: Attendance[]): { state: SessionState; lastEvent: Attendance | null } {
  if (records.length === 0) return { state: "OUT", lastEvent: null };
  const sorted = records.slice().sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  const last = sorted[0];
  let state: SessionState = "OUT";
  switch (last.type) {
    case "CHECK_OUT": state = "OUT"; break;
    case "CHECK_IN": case "LUNCH_END": case "AFK_END": case "RELAX_END": state = "IN"; break;
    case "LUNCH_START": state = "LUNCH"; break;
    case "AFK_START": state = "AFK"; break;
    case "RELAX_START": state = "RELAX"; break;
  }
  return { state, lastEvent: last };
}

export function groupAttendanceByDay(records: Attendance[]): Map<string, Attendance[]> {
  const sorted = records.slice().sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  const map = new Map<string, Attendance[]>();
  for (const r of sorted) {
    const key = dayKey(new Date(r.occurredAt));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}