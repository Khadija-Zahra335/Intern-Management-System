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

  try {
    const membership = await prisma.membership.create({
      data: { userId: intern.id, cohortId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json(membership, { status: 201 });
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