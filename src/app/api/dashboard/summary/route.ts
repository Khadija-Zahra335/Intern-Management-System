import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";
import { computeWeekNumber, startOfThisWeekPKT } from "@/lib/weeks";
import { isCohortActive } from "@/lib/cohorts";

// GET /api/dashboard/summary — mentor-only.
// Every number here is scoped to active (non-archived) cohorts only — the
// same rule as isCohortActive() in src/lib/cohorts.ts, written out as a
// Prisma `where` since that helper is a plain JS function, not a query
// filter. Keep these two in sync if that rule ever changes. Archived
// cohorts don't contribute to this dashboard anymore — their data is still
// fully intact and visible on their own cohort page, and on the /cohorts
// list page via GET /api/cohorts/overview.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const now = new Date();
  const weekStart = startOfThisWeekPKT(now);

  const activeCohortFilter = { isActive: true, endDate: { gte: now } };

  const [tasksPublishedThisWeek, linkedInPostsThisWeek, cohorts] = await Promise.all([
    prisma.task.count({
      where: {
        state: "PUBLISHED",
        createdAt: { gte: weekStart },
        cohort: activeCohortFilter,
      },
    }),
    prisma.linkedInPost.count({
      where: {
        loggedAt: { gte: weekStart },
        membership: { cohort: activeCohortFilter },
      },
    }),
    prisma.cohort.findMany({
      where: activeCohortFilter,
      orderBy: { startDate: "desc" },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            assignments: { select: { status: true, task: { select: { endDate: true } } } },
            linkedInPosts: { select: { weekNumber: true } },
            feedback: {
              select: { rating: true, weekNumber: true },
              orderBy: { weekNumber: "desc" },
              take: 1,
            },
          },
        },
      },
    }),
  ]);

  let activeInterns = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  let overdueTasks = 0;

  const cohortProgress = cohorts.map((cohort) => {
    activeInterns += cohort.memberships.length;

    let totalAssignments = 0;
    let completedAssignments = 0;
    let linkedInPercentSum = 0;

    const cappedNow = cohort.endDate && cohort.endDate < now ? cohort.endDate : now;
    const weeksElapsed = Math.max(1, computeWeekNumber(cohort.startDate, cappedNow));

    for (const m of cohort.memberships) {
      totalAssignments += m.assignments.length;
      completedAssignments += m.assignments.filter((a) => a.status === "COMPLETED").length;

      const weeksLogged = new Set(m.linkedInPosts.map((p) => p.weekNumber)).size;
      linkedInPercentSum += Math.min(100, Math.round((weeksLogged / weeksElapsed) * 100));

      const latestRating = m.feedback[0]?.rating;
      if (typeof latestRating === "number") {
        ratingSum += latestRating;
        ratingCount += 1;
      }

      for (const a of m.assignments) {
        if (a.status === "COMPLETED" || a.status === "SUBMITTED") continue;
        if (!a.task.endDate) continue;
        const endOfDueDay = new Date(a.task.endDate);
        endOfDueDay.setHours(23, 59, 59, 999);
        if (endOfDueDay < now) overdueTasks += 1;
      }
    }

    return {
      id: cohort.id,
      name: cohort.name,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      internsCount: cohort.memberships.length,
      taskCompletionPercent:
        totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
      linkedInCompletionPercent:
        cohort.memberships.length > 0 ? Math.round(linkedInPercentSum / cohort.memberships.length) : 0,
      status: isCohortActive(cohort) ? "Active" : "Archived",
    };
  });

  return NextResponse.json({
    activeInterns,
    tasksPublishedThisWeek,
    avgRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    linkedInPostsThisWeek,
    overdueTasks,
    cohorts: cohortProgress,
  });
}