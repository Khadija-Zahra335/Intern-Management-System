"use client";

import { useState } from "react";
import { Assignment, Submission, reviewSubmission } from "@/lib/api";

type Entry = { assignment: Assignment; submission: Submission };

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-none stroke-primary inline shrink-0" strokeWidth={1.5}>
      <path d="M8 12.5l4-4a2 2 0 10-2.8-2.8l-5 5a3.5 3.5 0 004.9 4.9l4.4-4.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-none stroke-current inline shrink-0" strokeWidth={1.5}>
      <path d="M8 12l4-4m-5 5l-1.5 1.5a3 3 0 01-4.2-4.2L3 8.8m9-3.6L13.5 3.7a3 3 0 014.2 4.2L16 9.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SubmissionsTab({ history, onReviewed }: { history: Entry[]; onReviewed: () => void }) {
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState("");

  // Tracks each assignment's most recent submission, since only the latest
  // one's approve/reject state can be inferred from the assignment's
  // current status (see note above — decisions aren't stored per-submission).
  const latestByAssignment = new Map<string, string>();
  for (const { assignment, submission } of history) {
    if (!latestByAssignment.has(assignment.id)) latestByAssignment.set(assignment.id, submission.id);
  }

  async function handleDecision(submissionId: string, decision: "APPROVE" | "REJECT") {
    setBusyId(submissionId);
    setError("");
    try {
      await reviewSubmission(submissionId, { decision, reviewNote: reviewNote.trim() || undefined });
      setReviewingId(null);
      setReviewNote("");
      onReviewed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setBusyId(null);
    }
  }

  if (history.length === 0) {
    return <p className="text-muted">No submissions yet.</p>;
  }

  return (
    <div>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="space-y-4">
        {history.map(({ assignment, submission }) => {
          const isLatest = latestByAssignment.get(assignment.id) === submission.id;
          const isPending = submission.reviewedAt === null;
          const isApproved = !isPending && isLatest && assignment.status === "COMPLETED";
          const isRejected = !isPending && isLatest && assignment.status !== "COMPLETED";

          return (
            <div key={submission.id} className="bg-white border border-border rounded-2xl p-5">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div>
                  <p className="font-semibold text-foreground">{assignment.task.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                {isPending ? (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 shrink-0">Pending</span>
                ) : isApproved ? (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 shrink-0">Approved</span>
                ) : isRejected ? (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 shrink-0">Changes requested</span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 shrink-0">Reviewed</span>
                )}
              </div>

              {submission.content && (
                <p className="text-sm text-foreground mb-3 whitespace-pre-wrap">{submission.content}</p>
              )}

              {submission.links.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {submission.links.map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary bg-accent-soft/60 rounded-lg px-2.5 py-1.5 hover:bg-accent-soft transition-colors"
                    >
                      <LinkIcon />
                      {link}
                    </a>
                  ))}
                </div>
              )}

              {submission.attachments && submission.attachments.length > 0 && (
                <ul className="text-sm mb-3 space-y-1">
                  {submission.attachments.map((att) => (
                    <li key={att.id} className="flex items-center gap-1.5">
                      <PaperclipIcon />
                      <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        {att.fileName}
                      </a>
                      <span className="text-xs text-muted">({(att.fileSize / 1024).toFixed(0)} KB)</span>
                    </li>
                  ))}
                </ul>
              )}

              {submission.reviewNote && (
                <div className="border-l-2 border-primary bg-accent-soft/40 rounded-r-lg px-3 py-2 mb-3">
                  <p className="text-xs font-medium text-muted mb-0.5">Mentor note</p>
                  <p className="text-sm text-foreground">{submission.reviewNote}</p>
                </div>
              )}

              {isPending && (
                reviewingId === submission.id ? (
                  <div className="space-y-2 mt-2">
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={2}
                      placeholder="Optional note for the intern..."
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDecision(submission.id, "APPROVE")}
                        disabled={busyId === submission.id}
                        className="bg-primary text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDecision(submission.id, "REJECT")}
                        disabled={busyId === submission.id}
                        className="border border-red-200 text-red-600 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                      >
                        Request changes
                      </button>
                      <button
                        onClick={() => { setReviewingId(null); setReviewNote(""); }}
                        className="text-sm text-muted hover:text-foreground px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setReviewingId(submission.id)}
                    className="rounded-lg border border-red-200 text-red-600 text-xs font-semibold px-3 py-1.5 hover:bg-red-50 transition-colors"
                  >
                    Review
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}