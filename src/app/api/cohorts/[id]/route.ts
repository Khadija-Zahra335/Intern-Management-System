import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, forbidden, unauthorized } from "@/lib/auth";
import { z } from "zod";

const archiveCohortSchema = z.object({
  isActive: z.literal(false),
});

// Archiving is one-way through the app — there's no endpoint that flips
// isActive back to true. If a cohort is ever archived by mistake, that's a
// direct database fix, same spirit as mentor accounts being seeded rather
// than self-service.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const { id } = await params;

  const body = await req.json();
  const parsed = archiveCohortSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cohort = await prisma.cohort.findUnique({ where: { id } });
  if (!cohort) {
    return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
  }
  if (!cohort.isActive) {
    return NextResponse.json({ error: "This cohort is already archived" }, { status: 400 });
  }

  const updated = await prisma.cohort.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json(updated);
}