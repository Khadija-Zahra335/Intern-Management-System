export function computeWeekNumber(cohortStartDate: string | Date, targetDate: string | Date): number {
  const start = new Date(cohortStartDate).getTime();
  const target = new Date(targetDate).getTime();
  const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

// PKT is UTC+5 year-round (no DST), matching the convention already used
// for the attendance late-checkout rule. Used by the mentor dashboard to
// window "this week" stats consistently with the rest of the app.
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Start of the current week (Monday 00:00, Pakistan time) expressed as a
 * real UTC Date, suitable for a Prisma `gte` filter.
 */
export function startOfThisWeekPKT(now: Date = new Date()): Date {
  const pktNow = new Date(now.getTime() + PKT_OFFSET_MS);
  const day = pktNow.getUTCDay(); // 0 = Sunday ... 6 = Saturday
  const daysSinceMonday = (day + 6) % 7;

  const pktMidnight = new Date(
    Date.UTC(pktNow.getUTCFullYear(), pktNow.getUTCMonth(), pktNow.getUTCDate())
  );
  pktMidnight.setUTCDate(pktMidnight.getUTCDate() - daysSinceMonday);

  return new Date(pktMidnight.getTime() - PKT_OFFSET_MS);
}