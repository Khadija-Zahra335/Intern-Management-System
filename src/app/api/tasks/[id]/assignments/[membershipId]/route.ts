import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";

// DELETE /api/tasks/[id]/assignments/[membershipId] — mentor-only.
// Unassigns one intern from one task. Unlike removing an intern from a
// cohort (soft — see cohorts/[id]/members/[membershipId]/route.ts), this is
// a hard delete of the TaskAssignment row: the schema cascade-deletes its
// Submissions (and their Attachments) and TaskActivity thread along with it
// (see `onDelete: Cascade` on both relations in schema.prisma). That's the
// intended behavior here — unassigning someone from a task removes their
// work on that task entirely, rather than leaving an orphaned history
// under a task they're no longer on.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; membershipId: string }> }
) {  
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const { id: taskId, membershipId } = await params;

  const assignment = await prisma.taskAssignment.findUnique({
    where: { taskId_membershipId: { taskId, membershipId } },
  });

  if (!assignment) {
    return NextResponse.json(
      { error: "This intern isn't assigned to this task" },
      { status: 404 }
    );
  }

  await prisma.taskAssignment.delete({ where: { id: assignment.id } });

  return NextResponse.json({ success: true });
}
