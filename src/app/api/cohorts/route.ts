// src/app/api/cohorts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, forbidden, unauthorized } from "@/lib/auth";
import { createCohortSchema } from "@/lib/validators/cohort";

// Creating Cohort
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const body = await req.json();
  const parsed = createCohortSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cohort = await prisma.cohort.create({
    data: {
      name: parsed.data.name,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    },
  });

  return NextResponse.json(cohort, { status: 201 });
}

// Getting Cohort info 
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const cohorts = await prisma.cohort.findMany({
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(cohorts);
}