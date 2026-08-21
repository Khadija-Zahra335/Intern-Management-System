import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";
import { getOwnedAssignment } from "@/lib/ownership";
import { createSubmissionSchema } from "@/lib/validators/submission";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "INTERN") return forbidden();

  const { id } = await params;

  const assignment = await getOwnedAssignment(id, user);
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  if (assignment.status === "COMPLETED") {
    return NextResponse.json(
      { error: "This task is already completed and cannot be resubmitted" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = createSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [submission] = await prisma.$transaction([
    prisma.submission.create({
      data: {
        assignmentId: id,
        content: parsed.data.content,
        links: parsed.data.links,
      },
    }),
    prisma.taskAssignment.update({
      where: { id },
      data: { status: "SUBMITTED" },
    }),
  ]);

  return NextResponse.json(submission, { status: 201 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const assignment = await getOwnedAssignment(id, user);
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }


  const submissions = await prisma.submission.findMany({
  where: { assignmentId: id },
  orderBy: { submittedAt: "desc" },
  include: { attachments: true },
});

  return NextResponse.json(submissions);
}