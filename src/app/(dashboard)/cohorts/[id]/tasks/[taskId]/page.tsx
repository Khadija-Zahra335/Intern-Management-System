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
  getSubmissions,
  type Cohort,
  type Task,
  type TaskAssignmentRow,
  type Membership,
  type Assignment,
  type Submission,
} from "@/lib/api";
import { MarkdownText } from "@/components/MarkdownText";
import { ActivityThread } from "@/components/ActivityThread";
import { SubmissionsTab } from "../../dashboard/[membershipId]/SubmissionTab";
import { formatDateRange } from "@/lib/format";

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

// Derived purely for display — the backend only stores the status enum
// above, so this is a UI-only mapping, not a stored value.
const STATUS_PROGRESS: Record<string, number> = {
  NOT_STARTED: 0,
  IN_PROGRESS: 50,
  BLOCKED: 25,
  SUBMITTED: 75,
  COMPLETED: 100,
};
const STATUS_BAR: Record<string, string> = {
  NOT_STARTED: "bg-gray-300",
  IN_PROGRESS: "bg-blue-500",
  BLOCKED: "bg-red-400",
  SUBMITTED: "bg-amber-500",
  COMPLETED: "bg-green-500",
};

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "activity", label: "Intern Activity" },
  { key: "submissions", label: "Submissions" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

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

  const [tab, setTab] = useState<TabKey>("overview");
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [assignments, setAssignments] = useState<TaskAssignmentRow[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState<Map<string, Submission[]>>(new Map());
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assignPick, setAssignPick] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

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

      const bySubmission = new Map<string, Submission[]>();
      await Promise.all(
        taskAssignments.map(async (a) => {
          const subs = await getSubmissions(a.assignmentId);
          bySubmission.set(a.assignmentId, subs);
        })
      );
      setSubmissionsByAssignment(bySubmission);
    } catch (err: any) {
      setError(err.message ?? "Failed to load task");
    } finally {
      setLoading(false);
    }
  }

  async function reloadSubmissions() {
    const bySubmission = new Map<string, Submission[]>();
    await Promise.all(
      assignments.map(async (a) => {
        const subs = await getSubmissions(a.assignmentId);
        bySubmission.set(a.assignmentId, subs);
      })
    );
    setSubmissionsByAssignment(bySubmission);
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
      setShowAssign(false);
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
  setUnassigningId(assignmentRow.membershipId);
  setError("");
  try {
    await removeTaskAssignment(taskId, assignmentRow.membershipId);
    if (selectedAssignmentId === assignmentRow.assignmentId) setSelectedAssignmentId(null);
    setConfirmRemoveId(null);
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
      setTab("activity");
    }
  }, [assignmentParam, assignments]);

  // Default to the first intern's thread once assignments load, so the
  // Activity/Submissions tabs show real content instead of an empty state.
  useEffect(() => {
    if (!selectedAssignmentId && assignments.length > 0) {
      setSelectedAssignmentId(assignments[0].assignmentId);
    }
  }, [assignments, selectedAssignmentId]);

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

  const selectedIntern = assignments.find((a) => a.assignmentId === selectedAssignmentId) ?? null;
  const selectedSubmissions = selectedAssignmentId ? submissionsByAssignment.get(selectedAssignmentId) ?? [] : [];
  const pendingReviewCount = Array.from(submissionsByAssignment.values())
    .flat()
    .filter((s) => s.reviewedAt === null).length;

  // SubmissionsTab (shared with the intern-progress page) expects a full
  // Assignment record. `assignedAt` isn't returned by this task's
  // assignments endpoint and isn't rendered by that component, so it's
  // left blank rather than faked.
  const selectedAssignmentForSubmissions: Assignment | null = selectedIntern
    ? {
        id: selectedIntern.assignmentId,
        membershipId: selectedIntern.membershipId,
        taskId: task.id,
        status: selectedIntern.status,
        assignedAt: "",
        task: { title: task.title, description: task.description, startDate: task.startDate, endDate: task.endDate },
      }
    : null;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm mb-4">
        <Link href={`/cohorts/${id}`} className="text-muted hover:text-primary">
          {cohort?.name ?? "Cohort"}
        </Link>
        <span className="text-muted">›</span>
        <Link href={`/cohorts/${id}/tasks`} className="text-muted hover:text-primary">
          Tasks
        </Link>
        <span className="text-muted">›</span>
        <span className="text-foreground font-semibold">{task.title}</span>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="bg-white border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-accent-soft text-primary flex items-center justify-center shrink-0">
              <IconDocument className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground">{task.title}</h1>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted">
                <span className="flex items-center gap-1"><IconCalendar className="w-3.5 h-3.5" />{formatDateRange(task.startDate, task.endDate)}</span>
                <span className="flex items-center gap-1"><IconUsers className="w-3.5 h-3.5" />{cohort?.name ?? "—"}</span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${task.state === "PUBLISHED" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                >
                  {task.state === "PUBLISHED" ? "Published" : "Draft"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {task.state === "DRAFT" && (
              <>
                {cohort?.isActive ? (
                  <button
                    onClick={handlePublish}
                    disabled={busy}
                    className="rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
                  >
                    Publish
                  </button>
                ) : (
                  <span className="text-xs font-medium text-muted bg-gray-100 rounded-lg px-3 py-2">
                    Archived — can&apos;t publish
                  </span>
                )}
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="rounded-lg border border-red-200 text-red-600 text-sm font-semibold px-4 py-2 hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              </>
            )}
            <Link
              href={`/cohorts/${id}/tasks/${taskId}/edit`}
              className="rounded-lg border border-border text-foreground text-sm font-semibold px-4 py-2 hover:border-primary hover:text-primary transition-colors"
            >
              Edit Task
            </Link>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-accent-soft/60 p-1 rounded-lg mb-4 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === t.key ? "bg-white text-primary shadow-sm" : "text-muted hover:text-foreground"
              }`}
          >
            {t.label}
            {t.key === "activity" && assignments.length > 0 && (
              <span className="bg-white/70 text-inherit text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {assignments.length}
              </span>
            )}
            {t.key === "submissions" && pendingReviewCount > 0 && (
              <span className="bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {pendingReviewCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">
        <div>
          {tab === "overview" && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <div className="text-sm text-foreground">
                <MarkdownText content={task.description} />
              </div>
            </div>
          )}

          {tab === "activity" && (
            <ActivityThread
              assignmentId={selectedAssignmentId}
              mineRole="MENTOR"
              headerTitle={selectedIntern?.intern.name}
              headerSubtitle={selectedIntern ? task.title : undefined}
              emptyMessage="Select an intern from the list to see their activity on this task."
            />
          )}

          {tab === "submissions" && (
            selectedAssignmentForSubmissions ? (
              <SubmissionsTab
                history={selectedSubmissions.map((submission) => ({ assignment: selectedAssignmentForSubmissions, submission }))}
                onReviewed={reloadSubmissions}
                internName={selectedIntern!.intern.name}
                internEmail={selectedIntern!.intern.email}
              />
            ) : (
              <div className="bg-white border border-border rounded-2xl p-8 flex items-center justify-center">
                <p className="text-sm text-muted text-center">Select an intern from the list to see their submissions for this task.</p>
              </div>
            )
          )}
        </div>

        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-border">
            <p className="text-sm font-bold text-foreground">Interns ({assignments.length})</p>
          </div>
          <div className="p-2 space-y-0.5">
            {assignments.length === 0 ? (
              <p className="text-sm text-muted px-3 py-4">
                {task.state === "DRAFT" ? "Not published yet — no interns are assigned." : "No interns in this cohort."}
              </p>
            ) : (
             assignments.map((a) => {
  const palette = avatarPalette(a.membershipId);
  const selected = selectedAssignmentId === a.assignmentId;
  const confirming = confirmRemoveId === a.assignmentId;

  if (confirming) {
    return (
      <div key={a.assignmentId} className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
        <p className="text-xs text-foreground font-medium mb-2">
          Remove {a.intern.name} from this task? This deletes their submissions and activity on it —
          it can&apos;t be undone.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setConfirmRemoveId(null)}
            disabled={unassigningId === a.membershipId}
            className="text-xs font-semibold text-muted px-3 py-1.5 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleUnassign(a)}
            disabled={unassigningId === a.membershipId}
            className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {unassigningId === a.membershipId ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      key={a.assignmentId}
      className={`w-full flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${selected ? "bg-accent-soft border-accent" : "border-transparent hover:bg-accent-soft/50"
        }`}
    >
      <button
        onClick={() => setSelectedAssignmentId(a.assignmentId)}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
      >
        <div className={`w-8 h-8 rounded-full ${palette.bg} ${palette.text} flex items-center justify-center text-xs font-bold shrink-0`}>
          {a.intern.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{a.intern.name}</p>
          <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[a.status] ?? "bg-gray-100 text-gray-500"}`}>
            {STATUS_LABELS[a.status] ?? a.status}
          </span>
        </div>
      </button>
      <button
        onClick={() => setConfirmRemoveId(a.assignmentId)}
        title={`Remove ${a.intern.name} from this task`}
        className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-muted border border-border rounded-lg px-2 py-1.5 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
      >
        <IconTrash className="w-3.5 h-3.5" />
      </button>
    </div>
  );
})
            )}
          </div>

          {task.state === "PUBLISHED" && unassignedMembers.length > 0 && (
            <div className="px-2 pb-2">
              {showAssign ? (
                <div className="flex items-center gap-1.5 px-1 pt-1">
                  <select
                    value={assignPick}
                    onChange={(e) => setAssignPick(e.target.value)}
                    autoFocus
                    className="flex-1 min-w-0 rounded-lg border border-border px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  >
                    <option value="">Choose an intern…</option>
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
              ) : (
                <button
                  onClick={() => setShowAssign(true)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-primary text-xs font-semibold py-2 hover:bg-accent-soft/50 transition-colors"
                >
                  <IconPlus className="w-3.5 h-3.5" />
                  Add Interns
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IconDocument({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M6 2.5h5.5L16 7v9a1 1 0 01-1 1H6a1 1 0 01-1-1V3.5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M11 2.5V7h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7.5 11h5M7.5 13.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="7.5" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 16c0-2.5 2.2-4 5-4s5 1.5 5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12.5 4.7c1.2.3 2 1.3 2 2.3s-.8 2-2 2.3M15 16c0-2-1.4-3.4-3.3-3.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6h12M8 6V4.5a1 1 0 011-1h2a1 1 0 011 1V6m-7.5 0l.7 9a1 1 0 001 .9h5.6a1 1 0 001-.9l.7-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
} 