// src/lib/timezone.ts
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5, no DST in Pakistan

/** Returns the hour (0-23) of a UTC Date, as seen in Pakistan time. */
export function getPktHour(date: Date): number {
  const pkt = new Date(date.getTime() + PKT_OFFSET_MS);
  return pkt.getUTCHours();
}