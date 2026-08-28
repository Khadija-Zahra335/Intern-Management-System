import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";
import { addAssignmentSchema } from "@/lib/validators/assignment";
import { isCohortActive } from "@/lib/cohorts";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const { id: taskId } = await params;

  const body = await req.json();
  const parsed = addAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const cohort = await prisma.cohort.findUnique({ where: { id: task.cohortId } });
  if (!cohort || !isCohortActive(cohort)) {
    return NextResponse.json(
      { error: "This cohort is archived — interns can't be assigned to tasks here." },
      { status: 400 }
    );
  }

  const membership = await prisma.membership.findUnique({
    where: { id: parsed.data.membershipId },
  });
  if (!membership || membership.cohortId !== task.cohortId) {
    return NextResponse.json(
      { error: "That intern isn't a member of this task's cohort" },
      { status: 400 }
    );
  }
  if (!membership.isActive) {
    return NextResponse.json(
      { error: "That intern isn't an active member of this cohort" },
      { status: 400 }
    );
  }

  try {
    const assignment = await prisma.taskAssignment.create({
      data: { taskId, membershipId: membership.id },
      include: {
        membership: {
          select: { id: true, user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    return NextResponse.json(assignment, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "This intern is already assigned to this task" },
        { status: 409 }
      );
    }
    throw err;
  }
}

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