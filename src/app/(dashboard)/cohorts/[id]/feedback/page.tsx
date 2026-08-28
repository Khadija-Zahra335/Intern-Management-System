"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FormLabel } from "@/components/FormLabel";
import {
  Cohort,
  Membership,
  Feedback,
  getCohorts,
  getCohortMembers,
  getFeedback,
  giveFeedback,
} from "@/lib/api";

export default function FeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [history, setHistory] = useState<Feedback[]>([]);

  const [weekNumber, setWeekNumber] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBase() {
      setLoading(true);
      try {
        const [cohorts, memberList] = await Promise.all([getCohorts(), getCohortMembers(id)]);
        setCohort(cohorts.find((c) => c.id === id) ?? null);
        setMembers(memberList);
        if (memberList.length > 0) setSelectedId(memberList[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    loadBase();
  }, [id]);

  useEffect(() => {
    if (!selectedId) return;
    async function loadHistory() {
      setHistoryLoading(true);
      try {
        const feedback = await getFeedback(selectedId);
        setHistory(feedback);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load feedback history");
      } finally {
        setHistoryLoading(false);
      }
    }
    loadHistory();
  }, [selectedId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !weekNumber || !rating || !comment) {
      setError("Fill in week number, a rating, and a comment.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await giveFeedback({
        membershipId: selectedId,
        weekNumber: Number(weekNumber),
        rating,
        comment,
      });
      setWeekNumber("");
      setRating(null);
      setComment("");
      const feedback = await getFeedback(selectedId);
      setHistory(feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save feedback");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="p-6 text-muted">Loading...</p>;

  const selectedMember = members.find((m) => m.id === selectedId);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-foreground mb-1">
        Feedback {cohort ? `— ${cohort.name}` : ""}
      </h1>
      <p className="text-muted mb-6">Give weekly feedback with a 1–5 rating.</p>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-1">Member</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="border border-border rounded-md px-3 py-2 w-full bg-white"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.user.name} ({m.user.email})
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSubmit} className="border border-border rounded-lg p-4 bg-white mb-8 space-y-4">
        <div>
          <FormLabel required className="block text-sm font-medium text-foreground mb-1">Week number</FormLabel>
          <input
            type="number"
            min={1}
            value={weekNumber}
            onChange={(e) => setWeekNumber(e.target.value)}
            className="border border-border rounded-md px-3 py-2 w-32"
          />
        </div>

        <div>
          <FormLabel required className="block text-sm font-medium text-foreground mb-1">Rating</FormLabel>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={
                  rating === n
                    ? "bg-primary text-white w-9 h-9 rounded-md"
                    : "border border-primary text-primary w-9 h-9 rounded-md hover:bg-primary hover:text-white"
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FormLabel required className="block text-sm font-medium text-foreground mb-1">Comment</FormLabel>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="border border-border rounded-md px-3 py-2 w-full"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save feedback"}
        </button>
      </form>

      <h2 className="text-lg font-medium text-foreground mb-2">
        History {selectedMember ? `— ${selectedMember.user.name}` : ""}
      </h2>

      {historyLoading && <p className="text-muted">Loading history...</p>}

      {!historyLoading && history.length === 0 && (
        <p className="text-muted">No feedback given yet for this member.</p>
      )}

      <div className="space-y-3">
        {history
          .slice()
          .sort((a, b) => a.weekNumber - b.weekNumber)
          .map((f) => (
            <div key={f.id} className="border border-border rounded-lg p-3 bg-white">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-foreground">Week {f.weekNumber}</span>
                <span className="text-sm text-primary font-semibold">{f.rating}/5</span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{f.comment}</p>
            </div>
          ))}
      </div>
    </div>
  );
}