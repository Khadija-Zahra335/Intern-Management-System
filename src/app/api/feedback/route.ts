import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";
import { getOwnedMembership } from "@/lib/ownership";
import { upsertFeedbackSchema } from "@/lib/validators/feedback";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const body = await req.json();
  const parsed = upsertFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { id: parsed.data.membershipId },
  });
  if (!membership) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  const feedback = await prisma.feedback.upsert({
    where: {
      membershipId_weekNumber: {
        membershipId: parsed.data.membershipId,
        weekNumber: parsed.data.weekNumber,
      },
    },
    update: {
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      mentorId: user.userId,
    },
    create: {
      membershipId: parsed.data.membershipId,
      weekNumber: parsed.data.weekNumber,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      mentorId: user.userId,
    },
  });

  return NextResponse.json(feedback, { status: 201 });
}

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

  const feedback = await prisma.feedback.findMany({
    where: { membershipId },
    orderBy: { weekNumber: "asc" },
  });

  return NextResponse.json(feedback);
}