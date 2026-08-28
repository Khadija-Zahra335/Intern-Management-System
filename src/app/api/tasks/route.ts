import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, forbidden, unauthorized } from "@/lib/auth";
import { createTaskSchema } from "@/lib/validators/task";
import { isCohortActive } from "@/lib/cohorts";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cohort = await prisma.cohort.findUnique({ where: { id: parsed.data.cohortId } });
  if (!cohort) {
    return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
  }
  if (!isCohortActive(cohort)) {
    return NextResponse.json(
      { error: "This cohort is archived — new tasks can't be created here." },
      { status: 400 }
    );
  }

  if (parsed.data.startDate < cohort.startDate) {
    return NextResponse.json(
      {
        error: `Task start date can't be before the cohort's start date (${cohort.startDate.toISOString().slice(0, 10)})`,
      },
      { status: 400 }
    );
  }
  if (parsed.data.endDate > cohort.endDate) {
    return NextResponse.json(
      {
        error: `Task end date can't be after the cohort's end date (${cohort.endDate.toISOString().slice(0, 10)})`,
      },
      { status: 400 }
    );
  }

  const task = await prisma.task.create({
    data: {
      cohortId: parsed.data.cohortId,
      createdById: user.userId,
      title: parsed.data.title,
      description: parsed.data.description,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    },
  });

  return NextResponse.json(task, { status: 201 });
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const cohortId = req.nextUrl.searchParams.get("cohortId");

  const tasks = await prisma.task.findMany({
    where: cohortId ? { cohortId } : undefined,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tasks);
}