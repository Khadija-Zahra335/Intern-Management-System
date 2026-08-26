/**
 * Reverse of computeWeekNumber(): given a cohort's start date and a week
 * number, returns the [start, end) date range for that week. Week 1 starts
 * exactly on the cohort's start date.
 */
export function weekDateRange(cohortStartDate: string | Date, weekNumber: number): { start: Date; end: Date } {
  const cohortStart = new Date(cohortStartDate);
  const start = new Date(cohortStart.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}