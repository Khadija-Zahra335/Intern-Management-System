"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getCohorts,
  getTasks,
  getTaskAssignments,
  getCohortMembers,
  assignTaskToMember,
  removeTaskAssignment,
  publishTask,
  deleteTask,
  type Cohort,
  type Task,
  type TaskAssignmentRow,
  type Membership,
} from "@/lib/api";
import { MarkdownText } from "@/components/MarkdownText";
import { ActivityThread } from "@/components/ActivityThread";

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

export default function TaskDetailPage({ params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = use(params);
  const searchParams = useSearchParams();
  const assignmentParam = searchParams.get("assignment");

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [assignments, setAssignments] = useState<TaskAssignmentRow[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [assignPick, setAssignPick] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [cohorts, tasks, taskAssignments, cohortMembers] = await Promise.all([
        getCohorts(),
        getTasks(id),
        getTaskAssignments(taskId),
        getCohortMembers(id),
      ]);
      setCohort(cohorts.find((c) => c.id === id) ?? null);
      setTask(tasks.find((t) => t.id === taskId) ?? null);
      setAssignments(taskAssignments);
      setMembers(cohortMembers);
    } catch (err: any) {
      setError(err.message ?? "Failed to load task");
    } finally {
      setLoading(false);
    }
  }

  // Cohort's currently-active members who aren't already assigned this
  // task — candidates for the "Assign intern" picker below.
  const unassignedMembers = members.filter(
    (m) => !assignments.some((a) => a.membershipId === m.id)
  );

  async function handleAssign() {
    if (!assignPick) return;
    setAssigning(true);
    setError("");
    try {
      await assignTaskToMember(taskId, assignPick);
      setAssignPick("");
      await load();
    } catch (err: any) {
      setError(err.message ?? "Failed to assign intern");
    } finally {
      setAssigning(false);
    }
  }

  // Hard delete on the backend — takes that intern's submissions/activity
  // on this task with it. See src/app/api/tasks/[id]/assignments/[membershipId]/route.ts.
  async function handleUnassign(assignmentRow: TaskAssignmentRow) {
    if (
      !confirm(
        `Unassign ${assignmentRow.intern.name} from this task? This deletes their submissions and activity on it — it can't be undone.`
      )
    ) {
      return;
    }
    setUnassigningId(assignmentRow.membershipId);
    setError("");
    try {
      await removeTaskAssignment(taskId, assignmentRow.membershipId);
      if (selectedAssignmentId === assignmentRow.assignmentId) setSelectedAssignmentId(null);
      await load();
    } catch (err: any) {
      setError(err.message ?? "Failed to unassign intern");
    } finally {
      setUnassigningId(null);
    }
  }

  useEffect(() => {
    load();
  }, [id, taskId]);

  // Deep-link support: if we arrived via ?assignment=<id> (e.g. from the
  // Overview tab's task row), pre-select that intern's thread once their
  // assignment shows up in the list.
  useEffect(() => {
    if (assignmentParam && assignments.some((a) => a.assignmentId === assignmentParam)) {
      setSelectedAssignmentId(assignmentParam);
    }
  }, [assignmentParam, assignments]);

  async function handlePublish() {
    setBusy(true);
    setError("");
    try {
      await publishTask(taskId);
      await load();
    } catch (err: any) {
      setError(err.message ?? "Failed to publish");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${task?.title}"? This can't be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteTask(taskId);
      window.location.href = `/cohorts/${id}/tasks`;
    } catch (err: any) {
      setError(err.message ?? "Failed to delete");
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (!task) {
    return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">Task not found.</p>;
  }

  const selectedIntern = assignments.find((a) => a.assignmentId === selectedAssignmentId);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1.5 text-sm">
          <Link href={`/cohorts/${id}/tasks`} className="text-muted hover:text-primary">
            {cohort?.name ?? "Cohort"}
          </Link>
          <span className="text-muted">›</span>
          <span className="text-foreground font-semibold">{task.title}</span>
        </div>
        <Link
          href={`/cohorts/${id}/tasks/${taskId}/edit`}
          className="rounded-lg border border-border text-foreground text-sm font-semibold px-4 py-2.5 hover:border-primary hover:text-primary transition-colors"
        >
          Edit Task
        </Link>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white border border-border rounded-2xl p-6">
          <div className="text-sm text-foreground">
            <MarkdownText content={task.description} />
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Status</p>
            <span
              className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${task.state === "PUBLISHED" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
            >
              {task.state === "PUBLISHED" ? "Published" : "Draft"}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Period</p>
            <p className="text-sm font-medium text-foreground">
              {new Date(task.startDate).toLocaleDateString()} – {new Date(task.endDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Cohort</p>
            <p className="text-sm font-medium text-foreground">{cohort?.name ?? "—"}</p>
          </div>

          {task.state === "DRAFT" && (
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              {cohort?.isActive ? (
                <button
                  onClick={handlePublish}
                  disabled={busy}
                  className="rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5 disabled:opacity-50"
                >
                  Publish
                </button>
              ) : (
                <span className="text-xs font-medium text-muted bg-gray-100 rounded-lg px-4 py-2.5">
                  Archived — can&apos;t publish
                </span>
              )}
              <button
                onClick={handleDelete}
                disabled={busy}
                className="rounded-lg border border-red-200 text-red-600 text-sm font-semibold px-4 py-2.5 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <h2 className="text-sm font-bold text-foreground mb-3">Intern Activity — {assignments.length}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4" style={{ minHeight: "480px" }}>
        <ActivityThread
          assignmentId={selectedAssignmentId}
          mineRole="MENTOR"
          headerTitle={selectedIntern?.intern.name}
          headerSubtitle={selectedIntern ? task.title : undefined}
          emptyMessage="Select an intern from the list to see their activity on this task."
        />

        <div className="bg-white border border-border rounded-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-4 border-b border-border shrink-0 space-y-2">
            <p className="text-sm font-bold text-foreground">Interns</p>
            {task.state === "PUBLISHED" && unassignedMembers.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={assignPick}
                  onChange={(e) => setAssignPick(e.target.value)}
                  className="flex-1 min-w-0 rounded-lg border border-border px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                >
                  <option value="">Assign an intern…</option>
                  {unassignedMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssign}
                  disabled={!assignPick || assigning}
                  className="shrink-0 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
                >
                  {assigning ? "Adding…" : "Add"}
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {assignments.length === 0 ? (
              <p className="text-sm text-muted px-3 py-4">
                {task.state === "DRAFT" ? "Not published yet — no interns are assigned." : "No interns in this cohort."}
              </p>
            ) : (
              assignments.map((a) => {
                const palette = avatarPalette(a.membershipId);
                return (
                  <div
                    key={a.assignmentId}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors border ${selectedAssignmentId === a.assignmentId ? "bg-accent-soft border-accent" : "border-transparent hover:bg-accent-soft/50"
                      }`}
                  >
                    <button
                      onClick={() => setSelectedAssignmentId(a.assignmentId)}
                      className="flex items-center gap-3 text-left flex-1 min-w-0"
                    >
                      <div className={`w-8 h-8 rounded-full ${palette.bg} ${palette.text} flex items-center justify-center text-xs font-bold shrink-0`}>
                        {a.intern.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{a.intern.name}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[a.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {STATUS_LABELS[a.status] ?? a.status}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleUnassign(a)}
                      disabled={unassigningId === a.membershipId}
                      title={`Unassign ${a.intern.name} from this task`}
                      className="shrink-0 text-muted hover:text-red-600 disabled:opacity-50 text-sm leading-none px-1.5 py-1"
                    >
                      {unassigningId === a.membershipId ? "…" : "×"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}