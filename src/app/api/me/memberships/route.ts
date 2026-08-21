import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.userId },
    include: {
      cohort: {
        select: { id: true, name: true, startDate: true, endDate: true, isActive: true },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return NextResponse.json(memberships);
}