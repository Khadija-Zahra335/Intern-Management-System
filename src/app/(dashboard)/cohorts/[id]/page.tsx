
"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getCohorts, getCohortProgress, Cohort, MemberProgress } from "@/lib/api";
import { AddMemberForm } from "@/app/(dashboard)/cohorts/[id]/AddMemberForm";

const navLinkClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white transition-colors";

export default function CohortDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [members, setMembers] = useState<MemberProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [cohorts, progress] = await Promise.all([getCohorts(), getCohortProgress(id)]);
      setCohort(cohorts.find((c) => c.id === id) ?? null);
      setMembers(progress);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cohort");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) return <p className="text-sm text-muted">Loading...</p>;

  if (error) {
    return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>;
  }

  return (
    <div>
      <Link href="/cohorts" className="text-sm text-primary hover:underline mb-4 inline-block">
        ← All cohorts
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{cohort?.name ?? "Cohort"}</h1>
          {cohort && (
            <p className="text-sm text-muted">
              {new Date(cohort.startDate).toLocaleDateString()} – {new Date(cohort.endDate).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {cohort && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cohort.isActive ? "bg-accent-soft text-primary" : "bg-gray-100 text-gray-500"}`}>
              {cohort.isActive ? "Active" : "Archived"}
            </span>
          )}
          <Link href={`/cohorts/${id}/tasks`} className={navLinkClass}>Manage tasks</Link>
          <Link href={`/cohorts/${id}/review`} className={navLinkClass}>Review submissions</Link>
          <Link href={`/cohorts/${id}/feedback`} className={navLinkClass}>Feedback</Link>
          <Link href={`/cohorts/${id}/checkins`} className={navLinkClass}>Check-ins</Link>
          <Link href={`/cohorts/${id}/dashboard`} className={navLinkClass}>Dashboard</Link>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-foreground">Members ({members.length})</h2>
        <AddMemberForm cohortId={id} existingEmails={members.map((m) => m.user.email)} onAdded={loadData} />
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted">No interns added yet.</p>
      ) : (
        <div className="bg-white border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {members.map((m) => (
            <Link
              key={m.membershipId}
              href={`/cohorts/${id}/dashboard/${m.membershipId}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-accent-soft transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-accent-soft text-primary flex items-center justify-center text-sm font-bold shrink-0">
                  {m.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {m.user.name}
                  </p>
                  <p className="text-xs text-muted mt-0.5 truncate">{m.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0">
                <div className="w-24 hidden sm:block">
                  <div className="h-1.5 rounded-full bg-border overflow-hidden mb-1">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${m.taskCompletion.percent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted">{m.taskCompletion.percent}% tasks</p>
                </div>
                <p className="text-xs text-muted w-24 text-right hidden md:block">
                  {m.latestRating ? `${m.latestRating.rating}/5 rating` : "No rating yet"}
                </p>
                <span className="text-muted group-hover:text-primary transition-colors">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}