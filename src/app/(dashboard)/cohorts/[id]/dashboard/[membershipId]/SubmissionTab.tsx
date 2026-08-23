"use client";

import { useState } from "react";
import { Assignment, Submission, reviewSubmission } from "@/lib/api";

type Entry = { assignment: Assignment; submission: Submission };

const AVATAR_PALETTES = [
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-green-100", text: "text-green-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
];

function avatarPalette(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

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

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-none stroke-current inline shrink-0" strokeWidth={1.8}>
      <path d="M12 4.5L7 10l5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function statusBadge(assignment: Assignment, submission: Submission, isLatest: boolean) {
  const isPending = submission.reviewedAt === null;
  if (isPending) return { label: "Pending", className: "bg-amber-50 text-amber-700" };
  if (isLatest && assignment.status === "COMPLETED") return { label: "Approved", className: "bg-green-50 text-green-700" };
  if (isLatest && assignment.status !== "COMPLETED") return { label: "Changes requested", className: "bg-red-50 text-red-600" };
  return { label: "Reviewed", className: "bg-gray-100 text-gray-500" };
}

export function SubmissionsTab({
  history,
  onReviewed,
  internName,
  internEmail,
}: {
  history: Entry[];
  onReviewed: () => void;
  internName: string;
  internEmail: string;
}) {
  const [reviewingEntry, setReviewingEntry] = useState<Entry | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState("");

  // Tracks each assignment's most recent submission, since only the latest
  // one's approve/reject state can be inferred from the assignment's
  // current status (decisions aren't stored per-submission).
  const latestByAssignment = new Map<string, string>();
  for (const { assignment, submission } of history) {
    if (!latestByAssignment.has(assignment.id)) latestByAssignment.set(assignment.id, submission.id);
  }

  async function handleDecision(submissionId: string, decision: "APPROVE" | "REJECT") {
    setBusyId(submissionId);
    setError("");
    try {
      await reviewSubmission(submissionId, { decision, reviewNote: reviewNote.trim() || undefined });
      setReviewingEntry(null);
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

  // ---- Review mode: full view replacing the list, no route change ----
  if (reviewingEntry) {
    const { assignment, submission } = reviewingEntry;
    const isLatest = latestByAssignment.get(assignment.id) === submission.id;
    const current = statusBadge(assignment, submission, isLatest);
    const priorAttempts = history
      .filter((h) => h.assignment.id === assignment.id && h.submission.id !== submission.id)
      .sort((a, b) => new Date(b.submission.submittedAt).getTime() - new Date(a.submission.submittedAt).getTime());
    const palette = avatarPalette(internEmail || internName);

    return (
      <div>
        <div className="flex items-center gap-1.5 text-sm mb-6">
          <button
            onClick={() => { setReviewingEntry(null); setReviewNote(""); setError(""); }}
            className="flex items-center gap-1 text-muted hover:text-primary"
          >
            <ChevronLeftIcon />
            {assignment.task.title}
          </button>
          <span className="text-muted">›</span>
          <span className="text-foreground font-semibold">Review Submission</span>
        </div>

        {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <div className="space-y-4">
            <div className="bg-white border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${palette.bg} ${palette.text} flex items-center justify-center text-sm font-bold shrink-0`}>
                    {internName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{internName}</p>
                    <p className="text-xs text-muted">{internEmail}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted uppercase tracking-wide">Task</p>
                  <p className="text-sm font-medium text-foreground">{assignment.task.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl p-5">
              <p className="text-sm font-semibold text-foreground mb-3">Submission content</p>
              {submission.content && (
                <p className="text-sm text-foreground whitespace-pre-wrap mb-3">{submission.content}</p>
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
                <ul className="text-sm space-y-1">
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
              {!submission.content && submission.links.length === 0 && (!submission.attachments || submission.attachments.length === 0) && (
                <p className="text-sm text-muted">No content on this submission.</p>
              )}
            </div>

            {submission.reviewedAt === null ? (
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-sm font-semibold text-foreground">Review note</p>
                <p className="text-xs text-muted mb-3">Visible to the intern on approval or rejection</p>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={4}
                  placeholder="Leave specific, actionable feedback..."
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary mb-3"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleDecision(submission.id, "REJECT")}
                    disabled={busyId === submission.id}
                    className="rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm font-semibold px-4 py-2 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleDecision(submission.id, "APPROVE")}
                    disabled={busyId === submission.id}
                    className="rounded-lg bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-sm font-semibold px-4 py-2 disabled:opacity-50"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ) : (
              submission.reviewNote && (
                <div className="bg-white border border-border rounded-2xl p-5">
                  <p className="text-sm font-semibold text-foreground mb-2">Mentor note</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{submission.reviewNote}</p>
                </div>
              )
            )}
          </div>

          <div className="bg-white border border-border rounded-2xl p-5 h-fit">
            <p className="text-sm font-semibold text-foreground mb-3">Submission history</p>
            {priorAttempts.length === 0 ? (
              <p className="text-xs text-muted mb-4">First submission — no prior attempts.</p>
            ) : (
              <ul className="space-y-2 mb-4">
                {priorAttempts.map((h) => {
                  const badge = statusBadge(h.assignment, h.submission, latestByAssignment.get(h.assignment.id) === h.submission.id);
                  return (
                    <li key={h.submission.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted">{new Date(h.submission.submittedAt).toLocaleDateString()}</span>
                      <span className={`font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="border-t border-border pt-3">
              <p className="text-[10px] font-medium text-muted uppercase tracking-wide mb-1.5">Current status</p>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${current.className}`}>{current.label}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- List mode ----
  return (
    <div>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="space-y-4">
        {history.map(({ assignment, submission }) => {
          const isLatest = latestByAssignment.get(assignment.id) === submission.id;
          const badge = statusBadge(assignment, submission, isLatest);
          const isPending = submission.reviewedAt === null;

          return (
            <div key={submission.id} className="bg-white border border-border rounded-2xl p-5">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div>
                  <p className="font-semibold text-foreground">{assignment.task.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${badge.className}`}>{badge.label}</span>
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
                <button
                  onClick={() => setReviewingEntry({ assignment, submission })}
                  className="rounded-lg border border-red-200 text-red-600 text-xs font-semibold px-3 py-1.5 hover:bg-red-50 transition-colors"
                >
                  Review
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}