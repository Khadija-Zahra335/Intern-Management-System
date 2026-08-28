import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, forbidden, unauthorized } from "@/lib/auth";
import { isCohortActive } from "@/lib/cohorts";

export async function POST(
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
  if (task.state === "PUBLISHED") {
    return NextResponse.json({ error: "Task is already published" }, { status: 400 });
  }

  const cohort = await prisma.cohort.findUnique({ where: { id: task.cohortId } });
  if (!cohort || !isCohortActive(cohort)) {
    return NextResponse.json(
      { error: "This cohort is archived — tasks can't be published here." },
      { status: 400 }
    );
  }

  const activeMembers = await prisma.membership.findMany({
    where: { cohortId: task.cohortId, isActive: true },
    select: { id: true },
  });

  const [, updatedTask] = await prisma.$transaction([
    prisma.taskAssignment.createMany({
      data: activeMembers.map((m) => ({
        taskId: task.id,
        membershipId: m.id,
      })),
      skipDuplicates: true,
    }),
    prisma.task.update({
      where: { id: task.id },
      data: { state: "PUBLISHED" },
    }),
  ]);

  return NextResponse.json(updatedTask);
}