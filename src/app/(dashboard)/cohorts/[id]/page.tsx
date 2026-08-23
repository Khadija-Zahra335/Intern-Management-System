"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getCohorts, getCohortMembers, getCohortProgress, Cohort, MemberProgress } from "@/lib/api";
import { AddMemberForm } from "@/app/(dashboard)/cohorts/[id]/AddMemberForm";
import { formatDateRange } from "@/lib/format";

const AVATAR_PALETTES = [
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-green-100", text: "text-green-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
];

function avatarPalette(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

// avatarUrl isn't in the data model yet (see chat) — this already prefers a
// real photo when one shows up later; for now every call passes no avatarUrl
// and it falls back to the colored-initial circle.
function Avatar({ seed, name, avatarUrl }: { seed: string; name: string; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  }
  const palette = avatarPalette(seed);
  return (
    <div
      className={`w-9 h-9 rounded-full ${palette.bg} ${palette.text} flex items-center justify-center text-sm font-bold shrink-0`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

const STAR_PATH = "M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6.1L10 14.9l-5.4 3 1.3-6.1L1.3 7.7l6.1-.6L10 1.5z";

function StarsDisplay({ rating }: { rating: number }) {
  const percent = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <div className="relative inline-flex" style={{ width: "84px", height: "16px" }}>
      <div className="absolute inset-0 flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <svg key={n} viewBox="0 0 20 20" className="w-4 h-4 fill-gray-200">
            <path d={STAR_PATH} />
          </svg>
        ))}
      </div>
      <div className="absolute inset-0 flex gap-0.5 overflow-hidden" style={{ width: `${percent}%` }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <svg key={n} viewBox="0 0 20 20" className="w-4 h-4 fill-amber-400 shrink-0">
            <path d={STAR_PATH} />
          </svg>
        ))}
      </div>
    </div>
  );
}

type MemberRow = MemberProgress & { joinedAt: string; avgRating: number | null };

export default function CohortDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [cohorts, memberships, progress] = await Promise.all([
        getCohorts(),
        getCohortMembers(id),
        getCohortProgress(id),
      ]);
      setCohort(cohorts.find((c) => c.id === id) ?? null);

      const joinedById = new Map(memberships.map((m) => [m.id, m.joinedAt]));
      setRows(
        progress.map((p) => {
          const avgRating =
            p.ratingHistory.length > 0
              ? p.ratingHistory.reduce((sum, r) => sum + r.rating, 0) / p.ratingHistory.length
              : null;
          return { ...p, joinedAt: joinedById.get(p.membershipId) ?? "", avgRating };
        })
      );
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

  const weeks =
    cohort != null
      ? Math.max(
          1,
          Math.round(
            (new Date(cohort.endDate).getTime() - new Date(cohort.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000)
          )
        )
      : 0;

  const totalCompleted = rows.reduce((sum, r) => sum + r.taskCompletion.completed, 0);
  const totalTasks = rows.reduce((sum, r) => sum + r.taskCompletion.total, 0);
  const overallPercent = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm text-muted mb-2">
        <Link href="/cohorts" className="hover:text-primary">
          Cohorts
        </Link>
        <span>›</span>
        <span className="text-foreground font-medium">{cohort?.name ?? "Cohort"}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{cohort?.name ?? "Cohort"}</h1>
          {cohort && (
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                cohort.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {cohort.isActive ? "Active" : "Archived"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/cohorts/${id}/tasks`}
            className="rounded-lg border border-border text-foreground text-sm font-semibold px-4 py-2.5 hover:border-primary hover:text-primary transition-colors"
          >
            Manage tasks
          </Link>
          <AddMemberForm cohortId={id} existingEmails={rows.map((r) => r.user.email)} onAdded={loadData} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Program dates</p>
          {cohort && (
            <>
              <p className="text-lg font-bold text-foreground">
                {formatDateRange(cohort.startDate, cohort.endDate)}
              </p>
              <p className="text-xs text-muted mt-2">{weeks} weeks total</p>
            </>
          )}
        </div>

        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Interns</p>
          <p className="text-lg font-bold text-foreground">{rows.length}</p>
          <p className="text-xs text-muted mt-2">in this cohort</p>
        </div>

        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Cohort progress</p>
          <div className="flex items-center gap-3">
            <p className="text-lg font-bold text-foreground">{overallPercent}%</p>
            <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${overallPercent}%` }} />
            </div>
          </div>
          <p className="text-xs text-muted mt-2">
            {totalCompleted}/{totalTasks} tasks
          </p>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Intern Cohort ({rows.length})</h2>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted px-5 py-6">No interns added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-muted uppercase tracking-wide bg-accent-soft/30">
                  <th className="px-5 py-3">Intern</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3">Progress</th>
                  <th className="px-5 py-3">Rating</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.membershipId} className="hover:bg-accent-soft/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar seed={r.membershipId} name={r.user.name} />
                        <p className="font-semibold text-foreground truncate">{r.user.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted whitespace-nowrap">{r.user.email}</td>
                    <td className="px-5 py-4 text-muted whitespace-nowrap">
                      {r.joinedAt
                        ? new Date(r.joinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 w-32">
                        <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${r.taskCompletion.percent}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted w-9 text-right">{r.taskCompletion.percent}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {r.avgRating != null ? (
                        <div className="flex items-center gap-2">
                          <StarsDisplay rating={r.avgRating} />
                          <span className="text-xs text-muted">{r.avgRating.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">No rating yet</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/cohorts/${id}/dashboard/${r.membershipId}`}
                          className="text-xs font-semibold text-foreground border border-border rounded-lg px-3 py-1.5 hover:border-primary hover:text-primary transition-colors"
                        >
                          Profile
                        </Link>
                        <Link
                          href={`/cohorts/${id}/dashboard/${r.membershipId}?tab=feedback`}
                          className="text-xs font-semibold text-foreground border border-border rounded-lg px-3 py-1.5 hover:border-primary hover:text-primary transition-colors"
                        >
                          Feedback
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}