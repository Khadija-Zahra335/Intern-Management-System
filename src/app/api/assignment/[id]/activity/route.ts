import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { getOwnedAssignment } from "@/lib/ownership";
import { createActivitySchema } from "@/lib/validators/activity";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const assignment = await getOwnedAssignment(id, user);
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = createActivitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const activity = await prisma.taskActivity.create({
    data: {
      assignmentId: id,
      authorId: user.userId,
      content: parsed.data.content,
      links: parsed.data.links,
    },
  });

  return NextResponse.json(activity, { status: 201 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const assignment = await getOwnedAssignment(id, user);
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const activities = await prisma.taskActivity.findMany({
    where: { assignmentId: id },
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(activities);
}