"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Cohort,
  Membership,
  Assignment,
  Submission,
  getCohorts,
  getCohortMembers,
  getAssignments,
  getSubmissions,
  reviewSubmission,
} from "@/lib/api";

type ReviewItem = {
  member: Membership;
  assignment: Assignment;
  submission: Submission;
};

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [cohorts, members] = await Promise.all([getCohorts(), getCohortMembers(id)]);
      setCohort(cohorts.find((c) => c.id === id) ?? null);

      const pending: ReviewItem[] = [];

      await Promise.all(
        members.map(async (member) => {
          const assignments = await getAssignments(member.id);
          const submitted = assignments.filter((a) => a.status === "SUBMITTED");

          await Promise.all(
            submitted.map(async (assignment) => {
              const submissions = await getSubmissions(assignment.id);
              if (submissions.length > 0) {
                pending.push({ member, assignment, submission: submissions[0] });
              }
            })
          );
        })
      );

      setItems(pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleDecision(submissionId: string, decision: "APPROVE" | "REJECT") {
    try {
      await reviewSubmission(submissionId, { decision });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    }
  }

  if (loading) return <p className="p-6 text-muted">Loading...</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-foreground mb-1">
        Review submissions {cohort ? `— ${cohort.name}` : ""}
      </h1>
      <p className="text-muted mb-6">
        {items.length} submission{items.length === 1 ? "" : "s"} waiting for review.
      </p>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {items.length === 0 && !error && (
        <p className="text-muted">Nothing pending right now.</p>
      )}

      <div className="space-y-4">
        {items.map(({ member, assignment, submission }) => (
          <div key={submission.id} className="border border-border rounded-lg p-4 bg-white">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-foreground">{assignment.task.title}</p>
                <p className="text-sm text-muted">
                  {member.user.name} ({member.user.email})
                </p>
              </div>
              <span className="text-xs text-muted">
                Submitted {new Date(submission.submittedAt).toLocaleDateString()}
              </span>
            </div>

            {submission.content && (
              <p className="text-sm text-foreground mb-2 whitespace-pre-wrap">
                {submission.content}
              </p>
            )}

            {submission.links.length > 0 && (
              <ul className="text-sm mb-3 space-y-1">
                {submission.links.map((link) => (
                  <li key={link}>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleDecision(submission.id, "APPROVE")}
                className="bg-primary text-white px-4 py-1.5 rounded-md text-sm hover:bg-primary-hover"
              >
                Approve
              </button>
              <button
                onClick={() => handleDecision(submission.id, "REJECT")}
                className="border border-primary text-primary px-4 py-1.5 rounded-md text-sm hover:bg-primary hover:text-white"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}