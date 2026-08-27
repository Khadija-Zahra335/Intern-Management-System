import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const { id: cohortId } = await params;

  const memberships = await prisma.membership.findMany({
    where: { cohortId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      assignments: { select: { status: true, task: { select: { endDate: true } } } },
      linkedInPosts: { select: { weekNumber: true } },
      feedback: {
        select: { weekNumber: true, rating: true },
        orderBy: { weekNumber: "desc" },
      },
    },
  });

  const now = new Date();

  const progress = memberships.map((m) => {
    const totalTasks = m.assignments.length;
    const completedTasks = m.assignments.filter((a) => a.status === "COMPLETED").length;
    // Overdue: not yet submitted/completed, and the task's own due date has
    // fully passed (end of that calendar day, not the instant it starts).
    const overdueCount = m.assignments.filter((a) => {
      if (a.status === "COMPLETED" || a.status === "SUBMITTED") return false;
      if (!a.task.endDate) return false;
      const endOfDueDay = new Date(a.task.endDate);
      endOfDueDay.setHours(23, 59, 59, 999);
      return endOfDueDay < now;
    }).length;
    const linkedInWeeksLogged = new Set(m.linkedInPosts.map((p) => p.weekNumber)).size;
    const latestFeedback = m.feedback[0] ?? null;

    return {
      membershipId: m.id,
      user: m.user,
      isActive: m.isActive,
      taskCompletion: {
        total: totalTasks,
        completed: completedTasks,
        percent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      overdueCount,
      linkedInWeeksLogged,
      latestRating: latestFeedback
        ? { weekNumber: latestFeedback.weekNumber, rating: latestFeedback.rating }
        : null,
      ratingHistory: m.feedback.slice().reverse().map((f) => ({
        weekNumber: f.weekNumber,
        rating: f.rating,
      })),
    };
  });

  return NextResponse.json(progress);
}