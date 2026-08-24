"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MarkdownText } from "@/components/MarkdownText";
import { ActivityThread } from "@/components/ActivityThread";
import { formatDate } from "@/lib/format";
import { uploadAttachment } from "@/lib/api";
import {
  Assignment,
  Submission,
  getMyMemberships,
  getAssignments,
  getSubmissions,
  createSubmission,
  updateAssignmentStatus,
} from "@/lib/api";

const STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-500",
  IN_PROGRESS: "bg-blue-50 text-blue-600",
  BLOCKED: "bg-red-50 text-red-600",
  SUBMITTED: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-green-50 text-green-700",
};
const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
};

const SETTABLE_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED"] as const;

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-none stroke-current inline shrink-0" strokeWidth={1.5}>
      <path d="M8 12.5l4-4a2 2 0 10-2.8-2.8l-5 5a3.5 3.5 0 004.9 4.9l4.4-4.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <rect x="3" y="4" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 8h14M7 2.5V5M13 2.5V5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M17 3L3 9.5l5.5 2 2 5.5L17 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function TaskDetailPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusBusy, setStatusBusy] = useState(false);
  const [content, setContent] = useState("");
  const [linksText, setLinksText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const memberships = await getMyMemberships();
      const active = memberships.find((m) => m.isActive);
      if (!active) {
        setError("You're not currently in an active cohort.");
        setLoading(false);
        return;
      }

      const [assignments, subs] = await Promise.all([
        getAssignments(active.id),
        getSubmissions(assignmentId),
      ]);

      setAssignment(assignments.find((a) => a.id === assignmentId) ?? null);
      setSubmissions(subs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load task");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [assignmentId]);

  async function handleStatusChange(status: (typeof SETTABLE_STATUSES)[number]) {
    setStatusBusy(true);
    setError("");
    try {
      await updateAssignmentStatus(assignmentId, status);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleSubmitWork(e: React.FormEvent) {
    e.preventDefault();
    const links = linksText.split("\n").map((l) => l.trim()).filter(Boolean);

    if (!content.trim() && links.length === 0 && files.length === 0) {
      setError("Add some content, a link, or a file before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const submission = await createSubmission(assignmentId, { content: content.trim() || undefined, links });

      if (files.length > 0) {
        const failures: string[] = [];
        for (const file of files) {
          try {
            await uploadAttachment(submission.id, file);
          } catch (err) {
            failures.push(`${file.name}: ${err instanceof Error ? err.message : "upload failed"}`);
          }
        }
        if (failures.length > 0) {
          setError(`Submitted, but some files failed to upload — ${failures.join("; ")}`);
        }
      }

      setContent("");
      setLinksText("");
      setFiles([]);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading...</p>;

  if (!assignment) {
    return (
      <div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}
        <Link href="/my-tasks" className="text-sm text-primary hover:underline">← Back to my tasks</Link>
      </div>
    );
  }

  const canAct = assignment.status === "NOT_STARTED" || assignment.status === "IN_PROGRESS" || assignment.status === "BLOCKED";

  const sortedSubmissions = [...submissions].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
  const latestSubmission = sortedSubmissions[0] ?? null;

  let statusBadge: { label: string; className: string } | null = null;
  if (assignment.status === "SUBMITTED") {
    statusBadge = { label: "Pending", className: "bg-amber-50 text-amber-700" };
  } else if (assignment.status === "COMPLETED") {
    statusBadge = { label: "Approved", className: "bg-green-50 text-green-700" };
  } else if (latestSubmission && latestSubmission.reviewedAt !== null) {
    statusBadge = { label: "Changes requested", className: "bg-red-50 text-red-600" };
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm mb-6">
        <Link href="/my-tasks" className="text-muted hover:text-primary">My Tasks</Link>
        <span className="text-muted">›</span>
        <span className="text-foreground font-semibold">{assignment.task.title}</span>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              {(assignment.task.startDate || assignment.task.endDate) ? (
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {assignment.task.startDate ? formatDate(assignment.task.startDate) : "—"} –{" "}
                  {assignment.task.endDate ? formatDate(assignment.task.endDate) : "—"}
                </div>
              ) : <span />}

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-muted">My status</span>
                {canAct ? (
                  <select
                    value={assignment.status}
                    onChange={(e) => handleStatusChange(e.target.value as (typeof SETTABLE_STATUSES)[number])}
                    disabled={statusBusy}
                    className="border border-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50"
                  >
                    {SETTABLE_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[assignment.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {STATUS_LABELS[assignment.status] ?? assignment.status}
                  </span>
                )}
              </div>
            </div>

            <div className="text-sm text-foreground">
              <MarkdownText content={assignment.task.description} />
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-foreground">Submit Work</h2>
                {latestSubmission && (
                  <p className="text-xs text-muted mt-0.5">Last submitted {formatDate(latestSubmission.submittedAt)}</p>
                )}
              </div>
              {statusBadge && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusBadge.className}`}>
                  {statusBadge.label}
                </span>
              )}
            </div>

            {canAct ? (
              <form onSubmit={handleSubmitWork} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">What did you build?</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    placeholder="Describe your implementation. What decisions did you make? What trade-offs?"
                    className="border border-border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Links (GitHub PR, Figma, etc.)</label>
                  <textarea
                    value={linksText}
                    onChange={(e) => setLinksText(e.target.value)}
                    rows={2}
                    placeholder="https://github.com/you/repo/pull/1"
                    className="border border-border rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                  <p className="text-xs text-muted mt-1">One link per line if you have more than one.</p>
                </div>

                <div>
                  <input
                    type="file"
                    multiple
                    id="attach-file"
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                    className="hidden"
                  />
                  {files.length > 0 && (
                    <ul className="text-xs text-muted space-y-0.5 mb-2">
                      {files.map((f, i) => (
                        <li key={i}>{f.name} ({(f.size / 1024).toFixed(0)} KB)</li>
                      ))}
                    </ul>
                  )}
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="attach-file"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border text-foreground text-sm font-medium px-3.5 py-2 cursor-pointer hover:border-primary hover:text-primary transition-colors"
                    >
                      <PaperclipIcon />
                      Attach file
                    </label>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                      <SendIcon className="w-3.5 h-3.5" />
                      {submitting ? "Submitting..." : "Submit for Review"}
                    </button>
                  </div>
                  <p className="text-xs text-muted mt-1.5">PDF, images, ZIP, Word docs, or plain text — up to 4MB each.</p>
                </div>
              </form>
            ) : assignment.status === "SUBMITTED" ? (
              <p className="text-sm text-muted">Waiting for your mentor to review this submission.</p>
            ) : (
              <p className="text-sm text-muted">This task has been approved and marked complete.</p>
            )}
          </div>

          {sortedSubmissions.length > 0 && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h2 className="text-sm font-bold text-foreground mb-3">Submission history</h2>
              <div className="space-y-3">
                {sortedSubmissions.map((s) => (
                  <div key={s.id} className="border border-border rounded-lg p-3">
                    <p className="text-xs text-muted mb-1.5">Submitted {formatDate(s.submittedAt)}</p>
                    {s.content && <p className="text-sm text-foreground whitespace-pre-wrap mb-2">{s.content}</p>}
                    {s.links.length > 0 && (
                      <ul className="text-xs space-y-1 mb-2">
                        {s.links.map((link) => (
                          <li key={link}>
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                              {link}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.attachments && s.attachments.length > 0 && (
                      <ul className="text-xs space-y-1 mb-2">
                        {s.attachments.map((att) => (
                          <li key={att.id} className="flex items-center gap-1.5">
                            <PaperclipIcon />
                            <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                              {att.fileName}
                            </a>
                            <span className="text-muted">({(att.fileSize / 1024).toFixed(0)} KB)</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.reviewNote && (
                      <div className="bg-accent-soft/60 rounded-lg px-3 py-2 mt-2">
                        <p className="text-xs font-medium text-foreground mb-0.5">Mentor note</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{s.reviewNote}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ height: "600px" }}>
          <ActivityThread
            assignmentId={assignmentId}
            mineRole="INTERN"
            headerTitle="Activity"
            headerSubtitle="Comments between you and your mentor"
          />
        </div>
      </div>
    </div>
  );
}