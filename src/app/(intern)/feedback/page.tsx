"use client";

import { useEffect, useState } from "react";
import { getMyMemberships, getFeedback, Feedback, MyMembership } from "@/lib/api";

function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < rating;
        return (
          <svg key={i} viewBox="0 0 20 20" className={`w-4 h-4 ${filled ? "fill-amber-500" : "fill-gray-200"}`}>
            <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.9l-5.2 2.61.99-5.79-4.21-4.1 5.82-.85L10 1.5z" />
          </svg>
        );
      })}
    </div>
  );
}

function RatingTrendChart({ data }: { data: { weekNumber: number; rating: number }[] }) {
  const width = 600;
  const height = 140;
  const padding = 28;
  const minRating = 1;
  const maxRating = 5;
  const xStep = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  const yFor = (rating: number) =>
    height - padding - ((rating - minRating) / (maxRating - minRating)) * (height - padding * 2);
  const points = data.map((d, i) => ({ x: padding + i * xStep, y: yFor(d.rating), d }));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
      {points.length > 1 && (
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
        />
      )}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} className="fill-primary" />
          <title>{`Week ${p.d.weekNumber}: ${p.d.rating}/5`}</title>
          <text x={p.x} y={height - 6} textAnchor="middle" className="fill-muted text-[10px]">
            W{p.d.weekNumber}
          </text>
        </g>
      ))}
    </svg>
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

  const average =
    feedback.length > 0 ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length : null;
  const latest = feedback.length > 0 ? feedback[feedback.length - 1] : null;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Mentor Feedback</h1>
        <p className="text-muted text-sm mt-1">Weekly ratings and comments from your mentor.</p>
      </div>

      {feedback.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm text-sm text-muted">
          No feedback yet — your mentor hasn't rated a week yet.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs text-muted uppercase tracking-wide mb-1">Average rating</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-foreground">{average?.toFixed(1)}</span>
                <span className="text-muted text-sm">/ 5</span>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs text-muted uppercase tracking-wide mb-1">Latest (Week {latest?.weekNumber})</p>
              {latest && <Stars rating={latest.rating} />}
            </div>
          </div>

          {feedback.length > 1 && (
            <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
              <h2 className="font-medium text-foreground mb-2">Rating trend</h2>
              <RatingTrendChart data={feedback.map((f) => ({ weekNumber: f.weekNumber, rating: f.rating }))} />
            </div>
          )}

          <div className="space-y-3">
            {[...feedback].reverse().map((f) => (
              <div key={f.id} className="rounded-xl border border-border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-primary bg-accent-soft rounded-full px-2.5 py-1">
                    Week {f.weekNumber}
                  </span>
                  <Stars rating={f.rating} />
                </div>
                {f.comment && <p className="text-sm text-foreground leading-relaxed">{f.comment}</p>}
                <p className="text-xs text-muted mt-2">
                  Given on {new Date(f.createdAt).toLocaleDateString()}
                  {f.updatedAt !== f.createdAt && ` · updated ${new Date(f.updatedAt).toLocaleDateString()}`}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}