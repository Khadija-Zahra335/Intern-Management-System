  import { prisma } from "@/lib/prisma";

  /**
   * Loads a TaskAssignment and checks that the given user is allowed to act on it.
   * Mentors can act on any assignment. Interns only on their own (via membershipId -> userId).
   * Returns null if not found OR not owned — caller returns 404 either way.
   */
  export async function getOwnedAssignment(
    assignmentId: string,
    user: { userId: string; role: string }
  ) {
    const assignment = await prisma.taskAssignment.findUnique({
      where: { id: assignmentId },
      include: { membership: true },
    });

    if (!assignment) return null;
    if (user.role === "MENTOR") return assignment;
    if (assignment.membership.userId === user.userId) return assignment;

    return null; // exists, but not theirs -> treat as not found
  }

  // Attendence ownership
  export async function getOwnedMembership(
    membershipId: string,
    user: { userId: string; role: string }
  ) {
    const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
    if (!membership) return null;
    if (user.role === "MENTOR") return membership;
    if (membership.userId === user.userId) return membership;
    return null;
  }

  
  export async function getOwnedSubmission(
  submissionId: string,
  user: { userId: string; role: string }
) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: { include: { membership: true } } },
  });

  if (!submission) return null;
  if (user.role === "MENTOR") return submission;
  if (submission.assignment.membership.userId === user.userId) return submission;

  return null;
}