import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";
import { getOwnedMembership } from "@/lib/ownership";
import { logAttendanceSchema } from "@/lib/validators/attendance";
import { getPktHour } from "@/lib/timezone";

const LATE_CHECKOUT_HOUR_PKT = 20; // 8 PM

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "INTERN") return forbidden(); // only interns clock attendance

  const body = await req.json();
  const parsed = logAttendanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const membership = await getOwnedMembership(parsed.data.membershipId, user);
  if (!membership) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  const now = new Date();

  if (parsed.data.type === "CHECK_OUT" && getPktHour(now) >= LATE_CHECKOUT_HOUR_PKT) {
    const wordCount = parsed.data.note?.trim().split(/\s+/).filter(Boolean).length ?? 0;
    if (wordCount < 5) {
      return NextResponse.json(
        { error: "We noticed you are a checking out a little bit today. No worries. Describe reason for record." },
        { status: 400 }
      );
    }
  }

  const attendance = await prisma.attendance.create({
    data: {
      membershipId: parsed.data.membershipId,
      type: parsed.data.type,
      occurredAt: now,
      note: parsed.data.note,
    },
  });

  return NextResponse.json(attendance, { status: 201 });
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

  const records = await prisma.attendance.findMany({
    where: { membershipId },
    orderBy: { occurredAt: "desc" },
  });

  return NextResponse.json(records);
}