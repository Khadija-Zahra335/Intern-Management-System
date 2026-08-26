import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";
import { getOwnedMembership } from "@/lib/ownership";
import { checkRateLimit } from "@/lib/assistantRateLimiter";
import { buildWeeklyInsight } from "@/lib/weeklyInsight";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const { searchParams } = new URL(req.url);
  const membershipId = searchParams.get("membershipId");
  const weekNumberRaw = searchParams.get("weekNumber");
  const weekNumber = weekNumberRaw ? parseInt(weekNumberRaw, 10) : NaN;

  if (!membershipId || !Number.isFinite(weekNumber) || weekNumber < 1) {
    return NextResponse.json({ error: "membershipId and a valid weekNumber are required." }, { status: 400 });
  }

  const membership = await getOwnedMembership(membershipId, user);
  if (!membership) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const rate = checkRateLimit(user.userId);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rate.retryAfter}s.` },
      { status: 429 }
    );
  }

  try {
    const insight = await buildWeeklyInsight(membershipId, weekNumber);
    return NextResponse.json(insight);
  } catch {
    return NextResponse.json({ error: "Couldn't build the weekly insight." }, { status: 500 });
  }
}