"use client";

import { useEffect, useState } from "react";
import { MyMembership, Assignment, getMyMemberships, getAssignments } from "@/lib/api";
import { computeWeekNumber } from "@/lib/weeks";
import { formatDate } from "@/lib/format";
import Link from "next/link";
import { MarkdownText, markdownPreview } from "@/components/MarkdownText";

const STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-500",
  IN_PROGRESS: "bg-blue-50 text-blue-600",
  BLOCKED: "bg-red-50 text-red-600",
  SUBMITTED: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-green-50 text-green-700",
};
const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
};

const STATUS_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "NOT_STARTED", label: "Not started" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "BLOCKED", label: "Blocked" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "COMPLETED", label: "Completed" },
] as const;

function isDueTomorrow(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const due = new Date(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return due.toDateString() === tomorrow.toDateString();
}

// A task's endDate is a calendar day, not a timestamp — it's only actually
// overdue once that whole day has passed, not the instant the clock ticks
// past midnight on the due date itself.
function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const due = new Date(dateStr);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 fill-none stroke-muted" strokeWidth={1.6}>
      <circle cx="8.5" cy="8.5" r="5.5" strokeLinecap="round" />
      <path d="M16 16l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 6v4.2l2.8 1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 10l2 2 4-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <rect x="3" y="4" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 8h14M7 2.5V5M13 2.5V5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 6.5v4M10 13.2h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  swatch,
  icon: Icon,
}: {
  label: string;
  value: number;
  swatch: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}) {
  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-medium text-muted uppercase tracking-wide">{label}</p>
        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${swatch}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function TaskCard({ a }: { a: Assignment }) {
  const isActionable = a.status !== "COMPLETED" && a.status !== "SUBMITTED";
  const overdue = isActionable && isOverdue(a.task.endDate);
  const dueTomorrow = isActionable && !overdue && isDueTomorrow(a.task.endDate);

  return (
    <Link
      href={`/my-tasks/${a.id}`}
      className="flex flex-col bg-white border border-border rounded-xl p-4 hover:border-primary hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-2 gap-2">
        <h3 className="font-semibold text-foreground text-sm leading-snug">{a.task.title}</h3>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${STATUS_STYLES[a.status] ?? "bg-gray-100 text-gray-500"}`}>
          {STATUS_LABELS[a.status] ?? a.status}
        </span>
      </div>
      <p className="text-xs text-muted mb-3 line-clamp-2">{markdownPreview(a.task.description)}</p>
      <div className="mt-auto flex items-center justify-between gap-2">
        {(a.task.startDate || a.task.endDate) ? (
          <p className="text-[11px] text-muted">
            {a.task.startDate ? formatDate(a.task.startDate) : "—"} – {a.task.endDate ? formatDate(a.task.endDate) : "—"}
          </p>
        ) : (
          <span />
        )}
        {overdue ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 shrink-0">
            Overdue
          </span>
        ) : dueTomorrow ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 shrink-0">
            Due tomorrow
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export default function MyTasksPage() {
  const [membership, setMembership] = useState<MyMembership | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["key"]>("ALL");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const memberships = await getMyMemberships();
        const active = memberships.find((m) => m.isActive) ?? null;
        setMembership(active);

        if (active) {
          setAssignments(await getAssignments(active.id));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load your tasks");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="text-sm text-muted">Loading...</p>;

  if (error) {
    return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>;
  }

  if (!membership) {
    return (
      <div className="text-center py-16">
        <p className="text-foreground font-medium mb-1">You&apos;re not currently in an active cohort.</p>
        <p className="text-sm text-muted">Once a mentor adds you to a cohort, your tasks will show up here.</p>
      </div>
    );
  }

  const currentWeek = computeWeekNumber(membership.cohort.startDate, new Date().toISOString());

  function weekOf(a: Assignment): number | null {
    return a.task.startDate ? computeWeekNumber(membership!.cohort.startDate, a.task.startDate) : null;
  }

  const ongoingCount = assignments.filter((a) => a.status !== "COMPLETED").length;
  const completedCount = assignments.filter((a) => a.status === "COMPLETED").length;
  const dueThisWeekCount = assignments.filter((a) => weekOf(a) === currentWeek).length;
  const blockedCount = assignments.filter((a) => a.status === "BLOCKED").length;

  const filtered = assignments.filter((a) => {
    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
    const matchesSearch = a.task.title.toLowerCase().includes(search.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const thisWeek = filtered.filter((a) => weekOf(a) === currentWeek);
  const otherActive = filtered.filter((a) => {
    const w = weekOf(a);
    return w !== null && w !== currentWeek && a.status !== "COMPLETED";
  });
  const completed = filtered.filter((a) => {
    const w = weekOf(a);
    return w !== null && w !== currentWeek && a.status === "COMPLETED";
  });
  const undated = filtered.filter((a) => weekOf(a) === null);

  const noResults = filtered.length === 0 && assignments.length > 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My tasks</h1>
        <p className="text-sm text-muted">
          {membership.cohort.name} — Week {currentWeek}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Ongoing" value={ongoingCount} swatch="bg-blue-50 text-blue-600" icon={ClockIcon} />
        <StatCard label="Completed" value={completedCount} swatch="bg-green-50 text-green-700" icon={CheckCircleIcon} />
        <StatCard label="Due this week" value={dueThisWeekCount} swatch="bg-amber-50 text-amber-700" icon={CalendarIcon} />
        <StatCard label="Blocked" value={blockedCount} swatch="bg-red-50 text-red-600" icon={AlertIcon} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                statusFilter === f.key
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted hover:border-primary hover:text-primary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {noResults ? (
        <p className="text-muted text-center py-12">No tasks match your search or filter.</p>
      ) : (
        <>
          <h2 className="text-lg font-medium text-foreground mb-3">This week</h2>
          {thisWeek.length === 0 ? (
            <p className="text-muted mb-8">No tasks scheduled for this week.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {thisWeek.map((a) => (
                <TaskCard key={a.id} a={a} />
              ))}
            </div>
          )}

          {otherActive.length > 0 && (
            <>
              <h2 className="text-lg font-medium text-foreground mb-3">Other active tasks</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {otherActive.map((a) => (
                  <TaskCard key={a.id} a={a} />
                ))}
              </div>
            </>
          )}

          {completed.length > 0 && (
            <div className="mb-8">
              <button
                onClick={() => setShowCompleted((s) => !s)}
                className="w-full flex items-center justify-between border border-border rounded-xl px-4 py-3 mb-3 hover:border-primary transition-colors">
                <span className="text-sm font-semibold text-foreground">Completed ({completed.length})</span>
                <ChevronDownIcon className={`w-4 h-4 text-muted transition-transform ${showCompleted ? "rotate-180" : ""}`} />
              </button>
              {showCompleted && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completed.map((a) => (
                    <TaskCard key={a.id} a={a} />
                  ))}
                </div>
              )}
            </div>
          )}

          {undated.length > 0 && (
            <>
              <h2 className="text-lg font-medium text-foreground mb-3">No date set</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {undated.map((a) => (
                  <TaskCard key={a.id} a={a} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}