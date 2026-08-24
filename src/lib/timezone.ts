// src/lib/timezone.ts
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5, no DST in Pakistan

/** Shifts a UTC instant into Pakistan time. Read its getUTC*() fields to get
 * PKT wall-clock values without depending on the host's own timezone. */
export function toPktDate(date: Date): Date {
  return new Date(date.getTime() + PKT_OFFSET_MS);
}

/** Returns the hour (0-23) of a UTC Date, as seen in Pakistan time. */
export function getPktHour(date: Date): number {
  return toPktDate(date).getUTCHours();
}

/** YYYY-MM-DD calendar-day key for a Date, as seen in Pakistan time — not
 * the viewer's browser timezone. Used to group attendance records so a
 * mentor viewing from outside Pakistan sees the same day boundaries an
 * intern in Pakistan actually experienced. */
export function pktDayKey(date: Date): string {
  const pkt = toPktDate(date);
  const y = pkt.getUTCFullYear();
  const m = String(pkt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(pkt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The real UTC instant of 23:59:59.999 PKT, on the PKT calendar day the
 * given Date falls on. Used to cap a still-open or overnight attendance
 * session at the end of the day it started on, instead of letting it
 * accrue hours indefinitely if a check-out is forgotten. */
export function endOfPktDay(date: Date): Date {
  const pkt = toPktDate(date);
  const endAsPktWallClock = Date.UTC(pkt.getUTCFullYear(), pkt.getUTCMonth(), pkt.getUTCDate(), 23, 59, 59, 999);
  return new Date(endAsPktWallClock - PKT_OFFSET_MS);
}