export function computeWeekNumber(cohortStartDate: string | Date, targetDate: string | Date): number {
  const start = new Date(cohortStartDate).getTime();
  const target = new Date(targetDate).getTime();
  const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}