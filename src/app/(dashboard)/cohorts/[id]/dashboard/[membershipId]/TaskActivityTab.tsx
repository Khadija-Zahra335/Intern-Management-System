"use client";

import { Assignment } from "@/lib/api";
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

export function TaskActivityTab({
  assignments,
  selectedAssignmentId,
  onSelect,
}: {
  assignments: Assignment[];
  selectedAssignmentId: string | null;
  onSelect: (assignmentId: string) => void;
}) {
  const selected = assignments.find((a) => a.id === selectedAssignmentId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4" style={{ minHeight: "480px" }}>
      <ActivityThread
        assignmentId={selectedAssignmentId}
        mineRole="MENTOR"
        headerTitle={selected?.task.title}
        emptyMessage="Select a task from the list to see its activity."
      />

      <div className="bg-white border border-border rounded-2xl flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-border shrink-0">
          <p className="text-sm font-bold text-foreground">Tasks</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {assignments.length === 0 ? (
            <p className="text-sm text-muted px-3 py-4">No tasks assigned yet.</p>
          ) : (
            assignments.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelect(a.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors border ${
                  selectedAssignmentId === a.id ? "bg-accent-soft border-accent" : "border-transparent hover:bg-accent-soft/50"
                }`}
              >
                <p className="text-sm font-semibold text-foreground truncate">{a.task.title}</p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[a.status] ?? "bg-gray-100 text-gray-500"}`}>
                  {STATUS_LABELS[a.status] ?? a.status}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}