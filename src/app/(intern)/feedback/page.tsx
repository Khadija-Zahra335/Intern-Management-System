"use client";

import { useEffect, useState } from "react";
import { getMyMemberships, getFeedback, Feedback, MyMembership } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { RatingTrendChart } from "@/components/RatingTrendChart";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 20 20" className={`w-4 h-4 ${n <= rating ? "fill-amber-500" : "fill-gray-200"}`}>
          <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6.1L10 14.9l-5.4 3 1.3-6.1L1.3 7.7l6.1-.6L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, dot }: { label: string; value: string; sub: string; dot: string }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-5 relative">
      <span className={`absolute top-5 right-5 w-6 h-6 rounded-md ${dot}`} />
      <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2 pr-8">{label}</p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted mt-2">{sub}</p>
    </div>
  );
}

export default function FeedbackPage() {
  const [membership, setMembership] = useState<MyMembership | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const memberships = await getMyMemberships();
        const active = memberships.find((m) => m.isActive) ?? memberships[0] ?? null;
        setMembership(active);
        if (active) {
          const data = await getFeedback(active.id);
          setFeedback(data);
        }
      } catch (e: any) {
        setError(e.message ?? "Failed to load feedback");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-8 text-muted">Loading feedback…</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!membership) return <div className="p-8 text-muted">No active cohort membership found.</div>;

  const sorted = [...feedback].sort((a, b) => a.weekNumber - b.weekNumber);
  const average = sorted.length > 0 ? sorted.reduce((sum, f) => sum + f.rating, 0) / sorted.length : null;
  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const mostRecentFirst = [...sorted].reverse();

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Feedback &amp; Ratings</h1>

      {sorted.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-8 text-center">
          <p className="text-foreground font-medium mb-1">No feedback yet.</p>
          <p className="text-sm text-muted">
            Your mentor hasn&apos;t rated a week yet — check back after your next check-in.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Overall average"
              value={average!.toFixed(1)}
              sub={`Over ${sorted.length} week${sorted.length === 1 ? "" : "s"}`}
              dot="bg-amber-500"
            />
            <StatCard label="Latest week" value={`${latest!.rating}/5`} sub={`Week ${latest!.weekNumber}`} dot="bg-green-500" />
            <StatCard label="Weeks with feedback" value={String(sorted.length)} sub="Total recorded" dot="bg-accent" />
          </div>

          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <h2 className="font-semibold text-foreground">Rating trend</h2>
              <p className="text-sm text-muted mt-0.5">Weekly mentor ratings over time</p>
            </div>
            <div className="border-t border-border px-6 py-6">
              <RatingTrendChart data={sorted.map((f) => ({ weekNumber: f.weekNumber, rating: f.rating }))} />
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <h2 className="font-semibold text-foreground">Feedback history</h2>
              <p className="text-sm text-muted mt-0.5">Most recent first</p>
            </div>
            <div className="border-t border-border divide-y divide-border">
              {mostRecentFirst.map((f) => (
                <div key={f.id} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-foreground">Week {f.weekNumber}</span>
                      <div className="flex items-center gap-1.5">
                        <StarRow rating={f.rating} />
                        <span className="text-sm text-muted">{f.rating}/5</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted shrink-0 whitespace-nowrap">{formatDate(f.createdAt)}</span>
                  </div>
                  {f.comment && <p className="text-sm text-foreground leading-relaxed">{f.comment}</p>}
                  {f.updatedAt !== f.createdAt && (
                    <p className="text-xs text-muted mt-2">Updated {formatDate(f.updatedAt)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}