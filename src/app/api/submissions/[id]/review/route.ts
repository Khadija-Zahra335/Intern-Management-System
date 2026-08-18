import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";
import { reviewSubmissionSchema } from "@/lib/validators/submission";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();
  if (user.role !== "MENTOR") return forbidden();

  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { assignment: true },
  });
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = reviewSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (submission.assignment.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: "Can only review a submission that's pending review (status SUBMITTED)" },
      { status: 400 }
    );
  }

  const newStatus = parsed.data.decision === "APPROVE" ? "COMPLETED" : "IN_PROGRESS";

  const [updatedSubmission] = await prisma.$transaction([
    prisma.submission.update({
      where: { id },
      data: {
        reviewNote: parsed.data.reviewNote,
        reviewedAt: new Date(),
      },
    }),
    prisma.taskAssignment.update({
      where: { id: submission.assignmentId },
      data: { status: newStatus },
    }),
  ]);

  return NextResponse.json(updatedSubmission);
}