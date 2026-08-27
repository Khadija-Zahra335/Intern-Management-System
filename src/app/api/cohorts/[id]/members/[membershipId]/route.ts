import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, forbidden, unauthorized } from "@/lib/auth";

// DELETE /api/cohorts/[id]/members/[membershipId] — mentor-only.
// Removes an intern from a cohort. This is a soft removal: it only flips
// Membership.isActive to false. Their TaskAssignments, Submissions,
// Attendance, Feedback, and LinkedInPosts are all left exactly as-is — the
// intern's history stays intact, they just drop out of the active member
// list (GET /members already filters on isActive: true) and stop being
// counted as an active member for future task publishes/backfills.
// Re-adding the same intern later (POST /members with the same email)
// reactivates this same row rather than creating a duplicate.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; membershipId: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const { id: cohortId, membershipId } = await params;

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
  });

  if (!membership || membership.cohortId !== cohortId) {
    return NextResponse.json({ error: "Member not found in this cohort" }, { status: 404 });
  }

  const updated = await prisma.membership.update({
    where: { id: membershipId },
    data: { isActive: false },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(updated);
}
 