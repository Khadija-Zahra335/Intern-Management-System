import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";

// GET /api/tasks/[id]/assignments — mentor-only.
// Every intern's assignment for one task, for the new task detail page's
// "Assignments" table. Read-only, doesn't touch any existing route.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const { id } = await params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const assignments = await prisma.taskAssignment.findMany({
    where: { taskId: id },
    include: {
      membership: {
        select: { id: true, user: { select: { id: true, name: true, email: true } } },
      },
      submissions: {
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: { submittedAt: true },
      },
    },
    orderBy: { membership: { user: { name: "asc" } } },
  });

  const items = assignments.map((a) => ({
    assignmentId: a.id,
    membershipId: a.membership.id,
    status: a.status,
    intern: { id: a.membership.user.id, name: a.membership.user.name, email: a.membership.user.email },
    submittedAt: a.submissions[0]?.submittedAt ?? null,
  }));

  return NextResponse.json(items);
}