import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, forbidden, unauthorized } from "@/lib/auth";
import { updateTaskSchema } from "@/lib/validators/task";

export async function PATCH(
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

  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const fields = parsed.data;

  if (task.state === "PUBLISHED") {
    const disallowed = Object.keys(fields).filter((k) => k !== "endDate");
    if (disallowed.length > 0) {
      return NextResponse.json(
        { error: `Cannot edit ${disallowed.join(", ")} on a published task — only endDate can be extended` },
        { status: 400 }
      );
    }
  }

  const newStart = fields.startDate ?? task.startDate;
  const newEnd = fields.endDate ?? task.endDate;
  if (newStart && newEnd && newEnd <= newStart) {
    return NextResponse.json({ error: "endDate must be after startDate" }, { status: 400 });
  }

  const updated = await prisma.task.update({ where: { id }, data: fields });
  return NextResponse.json(updated);
}

export async function DELETE(
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
    return NextResponse.json(
      { error: "Published tasks can't be deleted — they may already have intern work attached" },
      { status: 400 }
    );
  }

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}