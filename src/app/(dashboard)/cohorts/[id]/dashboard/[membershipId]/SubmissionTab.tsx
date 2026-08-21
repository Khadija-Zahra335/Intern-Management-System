"use client";

import { useState } from "react";
import { Assignment, Submission, reviewSubmission } from "@/lib/api";

export function SubmissionsTab({
  pending,
  onReviewed,
}: {
  pending: { assignment: Assignment; submission: Submission }[];
  onReviewed: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleDecision(submissionId: string, decision: "APPROVE" | "REJECT") {
    setBusyId(submissionId);
    setError("");
    try {
      await reviewSubmission(submissionId, { decision });
      onReviewed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setBusyId(null);
    }
  }

  if (pending.length === 0) {
    return <p className="text-muted">Nothing pending review right now.</p>;
  }

  function PaperclipIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-none stroke-primary inline shrink-0" strokeWidth={1.5}>
      <path d="M8 12.5l4-4a2 2 0 10-2.8-2.8l-5 5a3.5 3.5 0 004.9 4.9l4.4-4.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
  return (
    <div>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="space-y-4">
        {pending.map(({ assignment, submission }) => (
          <div key={submission.id} className="border border-border rounded-lg p-4 bg-white">
            <div className="flex justify-between items-start mb-2">
              <p className="font-medium text-foreground">{assignment.task.title}</p>
              <span className="text-xs text-muted">
                Submitted {new Date(submission.submittedAt).toLocaleDateString()}
              </span>
            </div>

            {submission.content && (
              <p className="text-sm text-foreground mb-2 whitespace-pre-wrap">{submission.content}</p>
            )}

            {submission.links.length > 0 && (
              <ul className="text-sm mb-3 space-y-1">
                {submission.links.map((link) => (
                  <li key={link}>
                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
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

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleDecision(submission.id, "APPROVE")}
                disabled={busyId === submission.id}
                className="bg-primary text-white px-4 py-1.5 rounded-md text-sm hover:bg-primary-hover disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => handleDecision(submission.id, "REJECT")}
                disabled={busyId === submission.id}
                className="border border-primary text-primary px-4 py-1.5 rounded-md text-sm hover:bg-primary hover:text-white disabled:opacity-50"
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