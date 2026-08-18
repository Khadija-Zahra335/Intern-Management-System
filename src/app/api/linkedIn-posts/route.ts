// src/app/api/linkedin-posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";
import { getOwnedMembership } from "@/lib/ownership";
import { logLinkedInPostSchema } from "@/lib/validators/linkedIn";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "INTERN") return forbidden(); // interns log their own posts

  const body = await req.json();
  const parsed = logLinkedInPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const membership = await getOwnedMembership(parsed.data.membershipId, user);
  if (!membership) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  try {
    const post = await prisma.linkedInPost.create({
      data: {
        membershipId: parsed.data.membershipId,
        weekNumber: parsed.data.weekNumber,
        url: parsed.data.url,
      },
    });
    return NextResponse.json(post, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "This URL has already been logged" },
        { status: 409 }
      );
    }
    throw err;
  }
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

  const posts = await prisma.linkedInPost.findMany({
    where: { membershipId },
    orderBy: { weekNumber: "desc" },
  });

  return NextResponse.json(posts);
}