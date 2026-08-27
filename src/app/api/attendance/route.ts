import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";
import { getOwnedMembership } from "@/lib/ownership";
import { logAttendanceSchema } from "@/lib/validators/attendance";
import { getPktHour, isPktAtOrAfter } from "@/lib/timezone";
import {
  stateAfterEvent,
  ATTENDANCE_VALID_FROM,
  noteWordCount,
  LATE_CHECKIN_HOUR_PKT,
  LATE_CHECKIN_MINUTE_PKT,
  LATE_CHECKIN_MIN_WORDS,
  LATE_CHECKIN_NOTE_MESSAGE,
} from "@/lib/attendanceHours";
import {type  AttendanceType } from "@/lib/api";

const LATE_CHECKOUT_HOUR_PKT = 20; // 8 PM

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const body = await req.json();
  const parsed = logAttendanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const isMentorOverride = user.role === "MENTOR";

  // Mentors may only force a CHECK_OUT, to close a session an intern forgot
  // to end themselves. They can't log any other attendance event on an
  // intern's behalf.
  if (isMentorOverride && parsed.data.type !== "CHECK_OUT") {
    return NextResponse.json(
      { error: "Mentors can only force a check-out to close a stuck session." },
      { status: 403 }
    );
  }
  if (!isMentorOverride && user.role !== "INTERN") return forbidden();

  const membership = await getOwnedMembership(parsed.data.membershipId, user);
  if (!membership) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  const lastRecord = await prisma.attendance.findFirst({
    where: { membershipId: parsed.data.membershipId },
    orderBy: { occurredAt: "desc" },
  });
  const currentState = lastRecord ? stateAfterEvent(lastRecord.type as AttendanceType) : "OUT";

  if (isMentorOverride) {
    if (currentState === "OUT") {
      return NextResponse.json({ error: "This intern is already checked out." }, { status: 400 });
    }
  } else {
    // Server-side state-machine check, mirroring the button gating in the
    // intern UI — closes the gap where the UI was the only thing stopping
    // an out-of-order event (e.g. checking out while still "on a break",
    // which would silently count that break time as work).
    if (ATTENDANCE_VALID_FROM[parsed.data.type] !== currentState) {
      return NextResponse.json(
        { error: "That action doesn't match your current status. Refresh the page and try again." },
        { status: 409 }
      );
    }
  }

  const now = new Date();

  if (parsed.data.type === "CHECK_OUT" && !isMentorOverride && getPktHour(now) >= LATE_CHECKOUT_HOUR_PKT) {
    if (noteWordCount(parsed.data.note) < 5) {
      return NextResponse.json(
        { error: "We noticed you are a checking out a little bit today. No worries. Describe reason for record." },
        { status: 400 }
      );
    }
  }

  // Late-checkin note rule — mirrors the late-checkout rule above. Checking
  // in at or after 10:30 AM PKT needs a short reason. Cutoff, minimum word
  // count, and the exact message are shared with the intern attendance page
  // (src/lib/attendanceHours.ts) so the client can recognize this specific
  // rejection and switch to showing the note field, rather than just
  // surfacing it as a generic error.
  if (
    parsed.data.type === "CHECK_IN" &&
    !isMentorOverride &&
    isPktAtOrAfter(now, LATE_CHECKIN_HOUR_PKT, LATE_CHECKIN_MINUTE_PKT)
  ) {
    if (noteWordCount(parsed.data.note) < LATE_CHECKIN_MIN_WORDS) {
      return NextResponse.json({ error: LATE_CHECKIN_NOTE_MESSAGE }, { status: 400 });
    }
  }

  const attendance = await prisma.attendance.create({
    data: {
      membershipId: parsed.data.membershipId,
      type: parsed.data.type,
      occurredAt: now,
      note: isMentorOverride
        ? (parsed.data.note?.trim() || "Checked out by mentor — session was left open too long.")
        : parsed.data.note,
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