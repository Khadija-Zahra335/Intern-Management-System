"use client";

import { useState } from "react";
import { Assignment, Feedback, giveFeedback } from "@/lib/api";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 20 20" className={`w-4 h-4 ${n <= rating ? "fill-primary" : "fill-border"}`}>
          <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6.1L10 14.9l-5.4 3 1.3-6.1L1.3 7.7l6.1-.6L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

export function FeedbackTab({
  membershipId,
  feedback,
  assignments,
  onSaved,
}: {
  membershipId: string;
  feedback: Feedback[];
  assignments: Assignment[];
  onSaved: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [weekNumber, setWeekNumber] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weekNumber || !rating || !comment) {
      setError("Fill in week number, a rating, and a comment.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await giveFeedback({ membershipId, weekNumber: Number(weekNumber), rating, comment });
      setWeekNumber("");
      setRating(null);
      setComment("");
      setShowForm(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save feedback");
    } finally {
      setSaving(false);
    }
  }

  const sorted = feedback.slice().sort((a, b) => a.weekNumber - b.weekNumber);
  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  const avgRating = sorted.length > 0 ? sorted.reduce((sum, f) => sum + f.rating, 0) / sorted.length : null;
  const latestDelta = latest && previous ? latest.rating - previous.rating : null;
  const tasksCompleted = assignments.filter((a) => a.status === "COMPLETED").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-foreground">Feedback &amp; Growth</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5"
        >
          {showForm ? "Cancel" : "Add Feedback"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Average rating</p>
          <p className="text-3xl font-bold text-foreground">{avgRating !== null ? avgRating.toFixed(1) : "—"}</p>
          <p className="text-xs text-muted mt-2">{sorted.length === 0 ? "No ratings yet" : `Over ${sorted.length} week${sorted.length === 1 ? "" : "s"}`}</p>
        </div>

        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Latest week</p>
          {latest ? (
            <>
              <p className="text-3xl font-bold text-foreground">{latest.rating.toFixed(1)}</p>
              <p className={`text-xs mt-2 ${latestDelta === null ? "text-muted" : latestDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
                {latestDelta === null ? `Week ${latest.weekNumber}` : `${latestDelta >= 0 ? "↑" : "↓"} ${Math.abs(latestDelta).toFixed(1)} from week ${previous!.weekNumber}`}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted mt-1">No rating yet</p>
          )}
        </div>

        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Tasks completed</p>
          <p className="text-3xl font-bold text-foreground">{tasksCompleted}</p>
          <p className="text-xs text-muted mt-2">of {assignments.length} assigned</p>
        </div>
      </div>

      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-border rounded-2xl p-5 bg-white mb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Week number</label>
            <input
              type="number"
              min={1}
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} className="p-0.5" aria-label={`${n} stars`}>
                  <svg
                    viewBox="0 0 20 20"
                    className={`w-7 h-7 transition-colors ${
                      rating !== null && n <= rating ? "fill-primary" : "fill-border hover:fill-accent"
                    }`}
                  >
                    <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6.1L10 14.9l-5.4 3 1.3-6.1L1.3 7.7l6.1-.6L10 1.5z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="border border-border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save feedback"}
          </button>
        </form>
      )}

      <h2 className="text-lg font-medium text-foreground mb-3">Feedback history</h2>

      {sorted.length === 0 ? (
        <p className="text-muted">No feedback given yet.</p>
      ) : (
        <div className="space-y-3">
          {sorted.slice().reverse().map((f) => (
            <div key={f.id} className="border border-border rounded-2xl p-4 bg-white">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-foreground">Week {f.weekNumber}</span>
                <StarRow rating={f.rating} />
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{f.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}