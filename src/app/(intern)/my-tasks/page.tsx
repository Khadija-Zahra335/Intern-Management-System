"use client";

import { useEffect, useState } from "react";
import { MyMembership, Assignment, getMyMemberships, getAssignments } from "@/lib/api";
import { computeWeekNumber } from "@/lib/weeks";
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

function TaskCard({ a }: { a: Assignment }) {
  return (
    <Link href={`/my-tasks/${a.id}`} className="block bg-white border border-border rounded-2xl p-5 hover:border-primary transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-foreground">{a.task.title}</h3>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-3 ${STATUS_STYLES[a.status] ?? "bg-gray-100 text-gray-500"}`}>
          {STATUS_LABELS[a.status] ?? a.status}
        </span>
      </div>
      <p className="text-sm text-muted mb-3">{markdownPreview(a.task.description)}</p>
      {(a.task.startDate || a.task.endDate) && (
        <p className="text-xs text-muted">
          {a.task.startDate ? new Date(a.task.startDate).toLocaleDateString() : "—"} –{" "}
          {a.task.endDate ? new Date(a.task.endDate).toLocaleDateString() : "—"}
        </p>
      )}
    </Link>
  );
}
export default function MyTasksPage() {
  const [membership, setMembership] = useState<MyMembership | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

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

    const thisWeek = assignments.filter((a) => weekOf(a) === currentWeek);
  const otherActive = assignments.filter((a) => {
    const w = weekOf(a);
    return w !== null && w !== currentWeek && a.status !== "COMPLETED";
  });
  const completed = assignments.filter((a) => {
    const w = weekOf(a);
    return w !== null && w !== currentWeek && a.status === "COMPLETED";
  });
  const undated = assignments.filter((a) => weekOf(a) === null);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">My tasks</h1>
        <p className="text-sm text-muted">
          {membership.cohort.name} — Week {currentWeek}
        </p>
      </div>

      <h2 className="text-lg font-medium text-foreground mb-3">This week</h2>
      {thisWeek.length === 0 ? (
        <p className="text-muted mb-8">No tasks scheduled for this week.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {thisWeek.map((a) => (
            <TaskCard key={a.id} a={a} />
          ))}
        </div>
      )}

      {otherActive.length > 0 && (
        <>
          <h2 className="text-lg font-medium text-foreground mb-3">Other active tasks</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
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
            className="flex items-center gap-2 text-lg font-medium text-foreground mb-3"
          >
            Completed ({completed.length})
            <span className={`text-sm text-muted transition-transform ${showCompleted ? "rotate-180" : ""}`}>▾</span>
          </button>
          {showCompleted && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {undated.map((a) => (
              <TaskCard key={a.id} a={a} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}