// A cohort is "active" only if it hasn't been manually archived AND its
// program hasn't ended yet. This is computed wherever it's checked — not
// written by a scheduled job — so a cohort past its end date is treated as
// archived everywhere in the app (blocked from new tasks/members/
// assignments, shown with an "Archived" badge) with nothing needing to run
// in the background.
export function isCohortActive(cohort: { isActive: boolean; endDate: Date | string }): boolean {
  return cohort.isActive && new Date(cohort.endDate) >= new Date();
}