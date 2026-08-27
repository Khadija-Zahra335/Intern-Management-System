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
    <div className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3" title={sub}>
      <span className={`w-9 h-9 rounded-lg shrink-0 ${dot}`} />
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted uppercase tracking-wide leading-snug">{label}</p>
        <p className="text-xl font-bold text-foreground leading-tight mt-0.5">{value}</p>
      </div>
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
      <h1 className="text-xl font-bold text-foreground mb-4">Feedback &amp; Ratings</h1>

      {sorted.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-8 text-center">
          <p className="text-foreground font-medium mb-1">No feedback yet.</p>
          <p className="text-sm text-muted">
            Your mentor hasn&apos;t rated a week yet — check back after your next check-in.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              label="Overall average"
              value={average!.toFixed(1)}
              sub={`Over ${sorted.length} week${sorted.length === 1 ? "" : "s"}`}
              dot="bg-amber-500"
            />
            <StatCard label="Latest week" value={`${latest!.rating}/5`} sub={`Week ${latest!.weekNumber}`} dot="bg-green-500" />
            <StatCard label="Weeks with feedback" value={String(sorted.length)} sub="Total recorded" dot="bg-accent" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-border rounded-2xl overflow-hidden flex flex-col">
              <div className="px-5 pt-4 pb-3 shrink-0">
                <h2 className="text-sm font-bold text-foreground">Feedback history</h2>
                <p className="text-xs text-muted mt-0.5">Most recent first</p>
              </div>
              <div className="border-t border-border divide-y divide-border flex-1 overflow-y-auto">
                {mostRecentFirst.map((f) => (
                  <div key={f.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-4 mb-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">Week {f.weekNumber}</span>
                        <div className="flex items-center gap-1.5">
                          <StarRow rating={f.rating} />
                          <span className="text-xs text-muted">{f.rating}/5</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted shrink-0 whitespace-nowrap">{formatDate(f.createdAt)}</span>
                    </div>
                    {f.comment && <p className="text-sm text-foreground leading-relaxed">{f.comment}</p>}
                    {f.updatedAt !== f.createdAt && (
                      <p className="text-xs text-muted mt-1.5">Updated {formatDate(f.updatedAt)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl overflow-hidden flex flex-col">
              <div className="px-5 pt-4 pb-3 shrink-0">
                <h2 className="text-sm font-bold text-foreground">Rating trend</h2>
                <p className="text-xs text-muted mt-0.5">Weekly mentor ratings over time</p>
              </div>
              <div className="border-t border-border px-5 py-4 flex-1 flex items-center">
                <RatingTrendChart data={sorted.map((f) => ({ weekNumber: f.weekNumber, rating: f.rating }))} height={220} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}``