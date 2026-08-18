import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { getOwnedMembership } from "@/lib/ownership";

// Getting all interns tasks
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const membershipId = req.nextUrl.searchParams.get("membershipId");
  if (!membershipId) {
    return NextResponse.json({ error: "membershipId query param is required" }, { status: 400 });
  }

  const membership = await getOwnedMembership(membershipId, user);
  if (!membership) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  const assignments = await prisma.taskAssignment.findMany({
    where: { membershipId },
    include: { task: { select: { title: true, description: true, startDate: true, endDate: true } } },
    orderBy: { assignedAt: "desc" },
  });

  return NextResponse.json(assignments);
}