"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Cohort, MemberProgress, getCohorts, getCohortProgress } from "@/lib/api";

export default function CohortDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [progress, setProgress] = useState<MemberProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [cohorts, memberProgress] = await Promise.all([
          getCohorts(),
          getCohortProgress(id),
        ]);
        setCohort(cohorts.find((c) => c.id === id) ?? null);
        setProgress(memberProgress);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <p className="p-6 text-muted">Loading...</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-foreground mb-1">
        Progress dashboard {cohort ? `— ${cohort.name}` : ""}
      </h1>
      <p className="text-muted mb-6">Task completion, LinkedIn cadence, and latest ratings per intern.</p>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {progress.length === 0 && !error && (
        <p className="text-muted">No members in this cohort yet.</p>
      )}

      <div className="bg-white border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {progress.map((p) => (
          <div key={p.membershipId} className="px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold text-foreground">{p.user.name}</p>
                <p className="text-xs text-muted">{p.user.email}</p>
              </div>
              <Link
                href={`/cohorts/${id}/dashboard/${p.membershipId}`}
                className="text-sm text-primary hover:underline"
              >
                View details →
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 items-center mt-3">
              <div>
                <p className="text-xs text-muted mb-1">
                  Tasks — {p.taskCompletion.completed}/{p.taskCompletion.total} ({p.taskCompletion.percent}%)
                </p>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${p.taskCompletion.percent}%` }}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs text-muted mb-1">LinkedIn</p>
                <p className="text-sm font-medium text-foreground">
                  {p.linkedInWeeksLogged} week{p.linkedInWeeksLogged === 1 ? "" : "s"} logged
                </p>
              </div>

              <div>
                <p className="text-xs text-muted mb-1">Latest rating</p>
                <p className="text-sm font-medium text-foreground">
                  {p.latestRating ? `${p.latestRating.rating}/5 (Week ${p.latestRating.weekNumber})` : "—"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}