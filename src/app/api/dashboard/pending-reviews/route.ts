import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";

// GET /api/dashboard/pending-reviews — mentor-only.
// Cross-cohort list of assignments sitting at SUBMITTED ("ready for
// review"), for the Dashboard's "Pending Reviews" panel. SUBMITTED can
// only be entered via a submission POST (see
// /api/assignment/[id]/submissions), and that route unconditionally
// updates the TaskAssignment row, so `updatedAt` reliably reflects the
// most recent submission time — no extra join to Submission needed.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const assignments = await prisma.taskAssignment.findMany({
    where: { status: "SUBMITTED" },
    orderBy: { updatedAt: "asc" }, // oldest pending first
    include: {
      task: {
        select: {
          id: true,
          title: true,
          cohort: { select: { id: true, name: true } },
        },
      },
      membership: {
        select: {
          id: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  const items = assignments.map((a) => ({
    assignmentId: a.id,
    submittedAt: a.updatedAt,
    task: { id: a.task.id, title: a.task.title },
    cohort: { id: a.task.cohort.id, name: a.task.cohort.name },
    membershipId: a.membership.id,
    intern: { id: a.membership.user.id, name: a.membership.user.name },
  }));

  return NextResponse.json({ count: items.length, items });
}