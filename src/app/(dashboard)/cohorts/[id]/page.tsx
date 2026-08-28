"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getCohorts, getCohortMembers, getCohortProgress, removeCohortMember, archiveCohort, Cohort, MemberProgress } from "@/lib/api";
import { AddMemberForm } from "@/app/(dashboard)/cohorts/[id]/AddMemberForm";
import { formatDateRange } from "@/lib/format";
import { isCohortActive } from "@/lib/cohorts";
import { useLoadState } from "@/hooks/useLoadState";

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
  const { loading, refreshing, startLoad, endLoad } = useLoadState();
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  async function loadData(initial = false) {
    startLoad(initial);
    try {
      const [cohorts, memberships, progress] = await Promise.all([
        getCohorts(),
        getCohortMembers(id),
        getCohortProgress(id),
      ]);
      setCohort(cohorts.find((c) => c.id === id) ?? null);

      const joinedById = new Map(memberships.map((m) => [m.id, m.joinedAt]));
      setRows(
        progress
          .filter((p) => p.isActive)
          .map((p) => {
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
      endLoad(initial);
    }
  }

  useEffect(() => {
    loadData(true);
  }, [id]);

  async function handleRemove(membershipId: string, name: string) {
    if (!confirm(`Remove ${name} from this cohort? Their task/feedback/attendance history is kept — you can re-add them later by email.`)) {
      return;
    }
    setRemovingId(membershipId);
    setError(null);
    try {
      await removeCohortMember(id, membershipId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  }

  function openArchiveConfirm() {
    setArchiveError(null);
    setShowArchiveConfirm(true);
  }

  function closeArchiveConfirm() {
    if (archiving) return;
    setShowArchiveConfirm(false);
  }

  async function confirmArchive() {
    if (!cohort) return;
    setArchiving(true);
    setArchiveError(null);
    try {
      await archiveCohort(id);
      setShowArchiveConfirm(false);
      await loadData();
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "Failed to archive cohort");
    } finally {
      setArchiving(false);
    }
  }

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

  const totalOverdue = rows.reduce((sum, r) => sum + r.overdueCount, 0);
  const ratedRows = rows.filter((r) => r.avgRating != null);
  const avgRatingCohort =
    ratedRows.length > 0 ? ratedRows.reduce((sum, r) => sum + (r.avgRating as number), 0) / ratedRows.length : null;
  const totalLinkedInLogs = rows.reduce((sum, r) => sum + r.linkedInWeeksLogged, 0);

  const active = cohort ? isCohortActive(cohort) : false;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm text-muted mb-2">
        <Link href="/cohorts" className="hover:text-primary">
          Cohorts
        </Link>
        <span>›</span>
        <span className="text-foreground font-medium">{cohort?.name ?? "Cohort"}</span>
      </div>

      {refreshing && <p className="text-xs text-muted mb-2">Syncing…</p>}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{cohort?.name ?? "Cohort"}</h1>
          {cohort && (
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
            >
              {active ? "Active" : "Archived"}
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
          {active ? (
            <>
              <AddMemberForm cohortId={id} existingEmails={rows.map((r) => r.user.email)} onAdded={loadData} />
              <button
                onClick={openArchiveConfirm}
                className="text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-4 py-2.5 hover:bg-red-50 transition-colors"
              >
                Archive cohort
              </button>
            </>
          ) : (
            <span className="text-xs font-medium text-muted bg-gray-100 rounded-lg px-4 py-2.5">
              Archived — can&apos;t add interns
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatTile
          label="Program dates"
          value={cohort ? formatDateRange(cohort.startDate, cohort.endDate) : "—"}
          hint={`${weeks} weeks total`}
          swatch="bg-accent-soft text-primary"
          icon={IconCalendar}
          valueClassName="text-sm font-bold"
        />
        <StatTile label="Interns" value={rows.length} hint="in this cohort" swatch="bg-blue-50 text-blue-600" icon={IconUsers} />
        <StatTile
          label="Cohort progress"
          value={`${overallPercent}%`}
          hint={`${totalCompleted}/${totalTasks} tasks`}
          swatch="bg-accent-soft text-primary"
          icon={IconChecklist}
        />
        <StatTile
          label="Overdue tasks"
          value={totalOverdue}
          hint="Not submitted, past due"
          swatch="bg-red-50 text-red-600"
          icon={IconAlert}
        />
        <StatTile
          label="Avg. rating"
          value={avgRatingCohort != null ? avgRatingCohort.toFixed(1) : "—"}
          hint={ratedRows.length > 0 ? `Based on ${ratedRows.length} rated intern${ratedRows.length === 1 ? "" : "s"}` : "No ratings yet"}
          swatch="bg-amber-50 text-amber-700"
          icon={IconStar}
        />
        <StatTile
          label="LinkedIn logs"
          value={totalLinkedInLogs}
          hint="Weeks logged across interns"
          swatch="bg-green-50 text-green-700"
          icon={IconLink}
        />
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
                  <th className="px-5 py-3">Overdue</th>
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
                      {r.overdueCount > 0 ? (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                          {r.overdueCount}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
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
                        <button
                          onClick={() => handleRemove(r.membershipId, r.user.name)}
                          disabled={removingId === r.membershipId}
                          className="text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          {removingId === r.membershipId ? "Removing…" : "Remove"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showArchiveConfirm && cohort && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeArchiveConfirm}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Archive cohort</h2>
              <button
                onClick={closeArchiveConfirm}
                disabled={archiving}
                className="text-muted hover:text-foreground text-lg leading-none disabled:opacity-50"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              <div className="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <IconAlert className="w-5 h-5" />
              </div>

              <p className="text-sm font-semibold text-foreground mb-3">
                Archive &quot;{cohort.name}&quot;?
              </p>

              <ul className="text-sm text-muted leading-relaxed space-y-1.5 mb-3 list-disc pl-4">
                <li>Mentors won&apos;t be able to add new interns or create new tasks in this cohort after this.</li>
                <li>Every member, task, submission, feedback entry, and attendance record already here stays exactly as it is and stays fully visible.</li>
              </ul>

              <p className="text-sm font-semibold text-red-600 mb-4">
                This action can&apos;t be undone from the app.
              </p>

              {archiveError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                  {archiveError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={closeArchiveConfirm}
                  disabled={archiving}
                  className="text-sm font-semibold text-foreground border border-border rounded-lg px-4 py-2.5 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmArchive}
                  disabled={archiving}
                  className="text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg px-4 py-2.5 disabled:opacity-50 transition-colors"
                >
                  {archiving ? "Archiving…" : "Archive cohort"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function StatTile({
  label,
  value,
  hint,
  swatch,
  icon: Icon,
  valueClassName = "text-xl font-bold",
}: {
  label: string;
  value: string | number;
  hint?: string;
  swatch: string;
  icon: (props: { className?: string }) => React.JSX.Element;
  valueClassName?: string;
}) {
  return (
    <div className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3" title={hint}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${swatch}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted uppercase tracking-wide leading-snug">{label}</p>
        <p className={`${valueClassName} text-foreground leading-tight mt-0.5`}>{value}</p>
      </div>
    </div>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 8h14" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 2.5v3M13.5 2.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 16c0-2.8 2-4.5 4.5-4.5s4.5 1.7 4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="14" cy="7" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12.8 11.7c2.1.2 3.7 1.8 3.7 4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconChecklist({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="3" width="12" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.5 3V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 10l2 2 4-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAlert({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 6.5v4M10 13.2h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 2.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L10 2.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLink({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M8 12l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8.5 5.5H6a3.5 3.5 0 0 0 0-7h-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}