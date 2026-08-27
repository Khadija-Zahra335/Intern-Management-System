import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, forbidden, unauthorized } from "@/lib/auth";
import { addMemberSchema } from "@/lib/validators/membership";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const { id: cohortId } = await params;

  const body = await req.json();
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
  if (!cohort) {
    return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
  }
  if (!cohort.isActive) {
    return NextResponse.json(
      { error: "This cohort is archived — interns can't be added." },
      { status: 400 }
    );
  }

  const intern = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!intern) {
    return NextResponse.json(
      { error: "No user with that email. They must register first." },
      { status: 404 }
    );
  }
  if (intern.role !== "INTERN") {
    return NextResponse.json(
      { error: "Only interns can be added to a cohort" },
      { status: 400 }
    );
  }

  // A prior Membership row for this (user, cohort) pair may already exist and
  // just be inactive (the intern was removed earlier — see the DELETE handler
  // in members/[membershipId]/route.ts). The unique constraint is on
  // (userId, cohortId) regardless of isActive, so a plain create() would 409
  // even though re-adding them is exactly what the mentor is asking for here.
  const existing = await prisma.membership.findUnique({
    where: { userId_cohortId: { userId: intern.id, cohortId } },
  });

  if (existing?.isActive) {
    return NextResponse.json(
      { error: "This intern is already a member of this cohort" },
      { status: 409 }
    );
  }

  try {
    // Create (or reactivate) the membership, then backfill TaskAssignment
    // rows for every already-PUBLISHED task in this cohort — mirrors the
    // exact pattern used in POST /api/tasks/[id]/publish. Without this, an
    // intern added (or re-added) after tasks have been published would have
    // an active Membership but zero assignments, so their task list would be
    // empty even though the mentor can see the published tasks.
    const membership = await prisma.$transaction(async (tx) => {
      const membership = existing
        ? await tx.membership.update({
            where: { id: existing.id },
            data: { isActive: true },
            include: { user: { select: { id: true, name: true, email: true } } },
          })
        : await tx.membership.create({
            data: { userId: intern.id, cohortId },
            include: { user: { select: { id: true, name: true, email: true } } },
          });

      const publishedTasks = await tx.task.findMany({
        where: { cohortId, state: "PUBLISHED" },
        select: { id: true },
      });

      if (publishedTasks.length > 0) {
        await tx.taskAssignment.createMany({
          data: publishedTasks.map((t) => ({
            taskId: t.id,
            membershipId: membership.id,
          })),
          skipDuplicates: true,
        });
      }

      return membership;
    });

    return NextResponse.json(membership, { status: existing ? 200 : 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "This intern is already a member of this cohort" },
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

  const { id: cohortId } = await params;

  const members = await prisma.membership.findMany({
    where: { cohortId, isActive: true },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members);
}