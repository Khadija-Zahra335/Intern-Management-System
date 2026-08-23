import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";
import { computeWeekNumber, startOfThisWeekPKT } from "@/lib/weeks";

// GET /api/dashboard/summary — mentor-only.
// Rolls up the numbers the new mentor Dashboard page needs: aggregate stat
// tiles + a per-cohort progress table. Read-only, doesn't touch any
// existing route's data or behavior.
//
// Known approximations (flagged, not silently assumed):
// - "tasksPublishedThisWeek" uses Task.createdAt as a stand-in for a real
//   publishedAt timestamp, since Task has no such field today. A task
//   created this week and already published counts; a task created
//   earlier but published this week does not.
// - "avgRating" is the average of each active membership's most recent
//   Feedback rating (same "latest rating" semantics as the per-intern
//   dashboard's Overview tab), not an average of every rating ever given.
// - "linkedInCompletionPercent" per cohort is the average, across that
//   cohort's active members, of (distinct weeks logged / weeks elapsed so
//   far), capped at 100%. There's no stored "expected weeks" value, so
//   this is computed from computeWeekNumber() the same way the intern
//   pages already do.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const now = new Date();
  const weekStart = startOfThisWeekPKT(now);

  const [tasksPublishedThisWeek, linkedInPostsThisWeek, cohorts] = await Promise.all([
    prisma.task.count({
      where: { state: "PUBLISHED", createdAt: { gte: weekStart } },
    }),
    prisma.linkedInPost.count({
      where: { loggedAt: { gte: weekStart } },
    }),
    prisma.cohort.findMany({
      orderBy: { startDate: "desc" },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            assignments: { select: { status: true } },
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
      status: cohort.isActive ? "Active" : "Archived",
    };
  });

  return NextResponse.json({
    activeInterns,
    tasksPublishedThisWeek,
    avgRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    linkedInPostsThisWeek,
    cohorts: cohortProgress,
  });
}