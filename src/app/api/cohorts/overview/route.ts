import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";
import { computeWeekNumber } from "@/lib/weeks";
import { isCohortActive } from "@/lib/cohorts";

// GET /api/cohorts/overview — mentor-only.
// Same per-cohort progress shape as /api/dashboard/summary's `cohorts`
// array, but for EVERY cohort — active and archived alike. This is what
// the /cohorts list page uses, so its "Archived" filter tab has something
// to show, now that /api/dashboard/summary only returns active cohorts.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const now = new Date();

  const cohorts = await prisma.cohort.findMany({
    orderBy: { startDate: "desc" },
    include: {
      memberships: {
        where: { isActive: true },
        include: {
          assignments: { select: { status: true } },
          linkedInPosts: { select: { weekNumber: true } },
        },
      },
    },
  });

  const cohortProgress = cohorts.map((cohort) => {
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

  return NextResponse.json({ cohorts: cohortProgress });
}