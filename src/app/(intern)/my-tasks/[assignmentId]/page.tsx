"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MarkdownText } from "@/components/MarkdownText";
import { uploadAttachment } from "@/lib/api";
import {
  Assignment,
  Submission,
  Activity,
  getMyMemberships,
  getAssignments,
  getSubmissions,
  createSubmission,
  updateAssignmentStatus,
  getActivity,
  postActivity,
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
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-none stroke-primary inline shrink-0" strokeWidth={1.5}>
      <path d="M8 12.5l4-4a2 2 0 10-2.8-2.8l-5 5a3.5 3.5 0 004.9 4.9l4.4-4.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function TaskDetailPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusBusy, setStatusBusy] = useState(false);
  const [content, setContent] = useState("");
  const [linksText, setLinksText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [posting, setPosting] = useState(false);
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

      const [assignments, subs, activityEntries] = await Promise.all([
        getAssignments(active.id),
        getSubmissions(assignmentId),
        getActivity(assignmentId),
      ]);

      setAssignment(assignments.find((a) => a.id === assignmentId) ?? null);
      setSubmissions(subs);
      setActivity(activityEntries);
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

  async function handlePostActivity() {
    if (!newMessage.trim()) return;
    setPosting(true);
    setError("");
    try {
      await postActivity(assignmentId, { content: newMessage.trim() });
      setNewMessage("");
      setActivity(await getActivity(assignmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setPosting(false);
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

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/my-tasks" className="text-sm text-primary hover:underline mb-4 inline-block">
        ← Back to my tasks
      </Link>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

      <div className="flex items-start justify-between mb-2">
        <h1 className="text-xl font-semibold text-foreground">{assignment.task.title}</h1>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-3 ${STATUS_STYLES[assignment.status] ?? "bg-gray-100 text-gray-500"}`}>
          {STATUS_LABELS[assignment.status] ?? assignment.status}
        </span>
      </div>

      <div className="border border-border rounded-2xl p-5 bg-white mb-6">
        <MarkdownText content={assignment.task.description} />
      </div>

      {(assignment.task.startDate || assignment.task.endDate) && (
        <p className="text-xs text-muted mb-6">
          {assignment.task.startDate ? new Date(assignment.task.startDate).toLocaleDateString() : "—"} –{" "}
          {assignment.task.endDate ? new Date(assignment.task.endDate).toLocaleDateString() : "—"}
        </p>
      )}

      {canAct && (
        <div className="mb-8">
          <p className="text-sm font-medium text-foreground mb-2">Update your status</p>
          <div className="flex gap-2">
            {SETTABLE_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={statusBusy || assignment.status === s}
                className={
                  assignment.status === s
                    ? "bg-primary text-white px-4 py-1.5 rounded-md text-sm font-medium"
                    : "border border-primary text-primary px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary hover:text-white disabled:opacity-50"
                }
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {assignment.status === "SUBMITTED" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mb-8">
          Submitted — waiting for your mentor to review it.
        </div>
      )}

      {assignment.status === "COMPLETED" && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 mb-8">
          Approved and marked complete.
        </div>
      )}

      {canAct && (
        <form onSubmit={handleSubmitWork} className="border border-border rounded-2xl p-5 bg-white mb-8 space-y-4">
          <h2 className="font-medium text-foreground">Submit your work</h2>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">What did you do?</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="Briefly describe what you're submitting..."
              className="border border-border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Links (one per line)</label>
            <textarea
              value={linksText}
              onChange={(e) => setLinksText(e.target.value)}
              rows={3}
              placeholder={"https://github.com/you/repo\nhttps://your-demo-link.com"}
              className="border border-border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

           <div>
            <label className="block text-sm font-medium text-foreground mb-1">Attach files (optional)</label>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-accent-soft/80"
            />
            {files.length > 0 && (
              <ul className="mt-2 text-xs text-muted space-y-0.5">
                {files.map((f, i) => (
                  <li key={i}>{f.name} ({(f.size / 1024).toFixed(0)} KB)</li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted mt-1">PDF, images, ZIP, Word docs, or plain text — up to 4MB each.</p>
          </div>

          
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Mark ready for review"}
          </button>
        </form>
      )}

      {submissions.length > 0 && (
        <div className="mb-8">
          <h2 className="font-medium text-foreground mb-3">Submission history</h2>
          <div className="space-y-3">
            {submissions.map((s) => (
              <div key={s.id} className="border border-border rounded-lg p-4 bg-white">
                <p className="text-xs text-muted mb-2">Submitted {new Date(s.submittedAt).toLocaleString()}</p>
                {s.content && <p className="text-sm text-foreground whitespace-pre-wrap mb-2">{s.content}</p>}
                {s.links.length > 0 && (
                  <ul className="text-sm space-y-1 mb-2">
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
                  <ul className="text-sm space-y-1 mb-2">
                    {s.attachments.map((att) => (
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

      <h2 className="font-medium text-foreground mb-3">Activity</h2>
      <div className="border border-border rounded-2xl bg-white p-4 mb-4 space-y-4 max-h-96 overflow-y-auto">
        {activity.length === 0 && <p className="text-muted text-sm">No activity yet.</p>}
        {activity.map((entry) => (
          <div key={entry.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-soft text-primary flex items-center justify-center text-xs font-bold shrink-0">
              {entry.author.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">{entry.author.name}</span>
                <span className="text-[11px] text-muted">{entry.author.role.toLowerCase()}</span>
                <span className="text-[11px] text-muted ml-auto shrink-0">{new Date(entry.createdAt).toLocaleString()}</span>
              </div>
              <div className="bg-accent-soft/60 rounded-lg rounded-tl-none px-3 py-2">
                <p className="text-sm text-foreground whitespace-pre-wrap">{entry.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-end">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          rows={1}
          placeholder="Ask a question or post an update..."
          className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
        />
        <button
          onClick={handlePostActivity}
          disabled={posting || !newMessage.trim()}
          className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-hover disabled:opacity-50 shrink-0"
        >
          {posting ? "..." : "Post"}
        </button>
      </div>
    </div>
  );
}