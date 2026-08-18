import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { getOwnedAssignment } from "@/lib/ownership";
import { updateStatusSchema } from "@/lib/validators/assignment";

export async function PATCH(
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
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.status === "COMPLETED" && user.role !== "MENTOR") {
    return NextResponse.json(
      { error: "Only a mentor can mark a task completed" },
      { status: 403 }
    );
  }

  const updated = await prisma.taskAssignment.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json(updated);
}