"use client";

import { useState } from "react";
import { Assignment, Feedback, giveFeedback, getWeeklyInsight, WeeklyInsight } from "@/lib/api";

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

function StatTile({
  label,
  value,
  swatch,
  hint,
  subNode,
}: {
  label: string;
  value: React.ReactNode;
  swatch: string;
  hint?: string;
  subNode?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3" title={hint}>
      <span className={`w-9 h-9 rounded-lg shrink-0 ${swatch}`} />
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted uppercase tracking-wide leading-snug">{label}</p>
        <p className="text-xl font-bold text-foreground leading-tight mt-0.5">{value}</p>
        {subNode}
      </div>
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

  const [insight, setInsight] = useState<WeeklyInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState("");

  async function handleGetInsight() {
    if (!weekNumber) return;
    setInsightLoading(true);
    setInsightError("");
    setInsight(null);
    try {
      const result = await getWeeklyInsight(membershipId, Number(weekNumber));
      setInsight(result);
    } catch (err) {
      setInsightError(err instanceof Error ? err.message : "Failed to load AI insight");
    } finally {
      setInsightLoading(false);
    }
  }

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
      setInsight(null);
      setInsightError("");
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
          className="rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2"
        >
          {showForm ? "Cancel" : "Add Feedback"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <StatTile
          label="Average rating"
          value={avgRating !== null ? avgRating.toFixed(1) : "—"}
          swatch="bg-amber-500"
          hint={sorted.length === 0 ? "No ratings yet" : `Over ${sorted.length} week${sorted.length === 1 ? "" : "s"}`}
        />

        <StatTile
          label="Latest week"
          value={latest ? latest.rating.toFixed(1) : "—"}
          swatch="bg-green-500"
          subNode={
            latest ? (
              <p className={`text-[11px] mt-0.5 ${latestDelta === null ? "text-muted" : latestDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
                {latestDelta === null
                  ? `Week ${latest.weekNumber}`
                  : `${latestDelta >= 0 ? "↑" : "↓"} ${Math.abs(latestDelta).toFixed(1)} from week ${previous!.weekNumber}`}
              </p>
            ) : (
              <p className="text-[11px] text-muted mt-0.5">No rating yet</p>
            )
          }
        />

        <StatTile
          label="Tasks completed"
          value={tasksCompleted}
          swatch="bg-accent"
          hint={`of ${assignments.length} assigned`}
        />
      </div>

      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-border rounded-2xl p-4 bg-white mb-6 space-y-3">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Week number</label>
              <input
                type="number"
                min={1}
                value={weekNumber}
                onChange={(e) => {
                  setWeekNumber(e.target.value);
                  setInsight(null);
                  setInsightError("");
                }}
                className="border border-border rounded-lg px-3 py-1.5 w-28 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>

            <button
              type="button"
              onClick={handleGetInsight}
              disabled={!weekNumber || insightLoading}
              className="text-xs font-medium text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-primary"
            >
              {insightLoading ? "Generating…" : "Get AI insight for this week"}
            </button>
          </div>

          {insightError && <p className="text-red-600 text-xs">{insightError}</p>}

          {insight && (
            <div className="bg-accent-soft border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5">
                AI weekly insight — read-only, write your own feedback below
              </p>
              <p className="text-sm text-foreground leading-relaxed">{insight.summary}</p>
              {insight.hasActivity && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-muted">
                  <span>
                    {insight.stats.tasksCompleted}/{insight.stats.tasksAssigned} tasks completed
                  </span>
                  {insight.stats.tasksBlocked > 0 && (
                    <span className="text-red-600">{insight.stats.tasksBlocked} blocked</span>
                  )}
                  {insight.stats.checkinNotes > 0 && (
                    <span>
                      {insight.stats.checkinNotes} check-in note{insight.stats.checkinNotes === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} className="p-0.5" aria-label={`${n} stars`}>
                  <svg
                    viewBox="0 0 20 20"
                    className={`w-6 h-6 transition-colors ${
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
            <label className="block text-xs font-medium text-foreground mb-1">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="border border-border rounded-lg px-3 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
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

      <h2 className="text-sm font-bold text-foreground mb-2.5">Feedback history</h2>

      {sorted.length === 0 ? (
        <p className="text-muted">No feedback given yet.</p>
      ) : (
        <div className="space-y-2.5">
          {sorted.slice().reverse().map((f) => (
            <div key={f.id} className="border border-border rounded-2xl p-3.5 bg-white">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-medium text-foreground">Week {f.weekNumber}</span>
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