"use client";

import { useEffect, useState } from "react";
import { Assignment, Attendance, Activity, getActivity, postActivity } from "@/lib/api";

const ATTENDANCE_META: Record<string, { label: string; dot: string }> = {
  CHECK_IN: { label: "Check in", dot: "bg-green-500" },
  CHECK_OUT: { label: "Check out", dot: "bg-gray-400" },
  LUNCH_START: { label: "Lunch start", dot: "bg-amber-500" },
  LUNCH_END: { label: "Lunch end", dot: "bg-amber-300" },
  AFK_START: { label: "AFK start", dot: "bg-red-400" },
  AFK_END: { label: "AFK end", dot: "bg-red-300" },
  RELAX_START: { label: "Relax start", dot: "bg-blue-400" },
  RELAX_END: { label: "Relax end", dot: "bg-blue-300" },
};

export function CheckinsTab({ assignments, attendance }: { assignments: Assignment[]; attendance: Attendance[] }) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(assignments.length > 0 ? assignments[0].id : "");
  const [activity, setActivity] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedAssignmentId) {
      setActivity([]);
      return;
    }
    setActivityLoading(true);
    getActivity(selectedAssignmentId)
      .then(setActivity)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load activity"))
      .finally(() => setActivityLoading(false));
  }, [selectedAssignmentId]);

  async function handlePost() {
    if (!selectedAssignmentId || !newMessage.trim()) return;
    setPosting(true);
    setError("");
    try {
      await postActivity(selectedAssignmentId, { content: newMessage.trim() });
      setNewMessage("");
      const entries = await getActivity(selectedAssignmentId);
      setActivity(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <h2 className="text-lg font-medium text-foreground mb-3">Attendance</h2>

      {attendance.length === 0 ? (
        <p className="text-muted mb-8">No attendance logged yet.</p>
      ) : (
        <div className="bg-white border border-border rounded-2xl divide-y divide-border overflow-hidden mb-8">
          {attendance.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${ATTENDANCE_META[a.type]?.dot ?? "bg-gray-400"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{ATTENDANCE_META[a.type]?.label ?? a.type}</p>
                  {a.note && <p className="text-xs text-muted mt-0.5">{a.note}</p>}
                </div>
              </div>
              <span className="text-xs text-muted">{new Date(a.occurredAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-medium text-foreground mb-3">Task activity</h2>

      {assignments.length === 0 ? (
        <p className="text-muted">No tasks assigned yet.</p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
            {assignments.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAssignmentId(a.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  selectedAssignmentId === a.id
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-foreground border-border hover:border-primary"
                }`}
              >
                {a.task.title}
              </button>
            ))}
          </div>

          <div className="bg-white border border-border rounded-2xl p-4 mb-4 space-y-4 max-h-96 overflow-y-auto">
            {activityLoading && <p className="text-muted text-sm">Loading activity...</p>}
            {!activityLoading && activity.length === 0 && <p className="text-muted text-sm">No activity posted yet.</p>}
            {activity.map((entry) => (
              <div key={entry.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-soft text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {entry.author.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{entry.author.name}</span>
                    <span className="text-[11px] text-muted">{entry.author.role.toLowerCase()}</span>
                    <span className="text-[11px] text-muted ml-auto shrink-0">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-accent-soft/60 rounded-lg rounded-tl-none px-3 py-2">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{entry.content}</p>
                    {entry.links.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {entry.links.map((link) => (
                          <li key={link}>
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                              {link}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 items-end">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={1}
              placeholder="Ask a question or post an update..."
              className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <button
              onClick={handlePost}
              disabled={posting || !newMessage.trim()}
              className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-hover disabled:opacity-50 shrink-0"
            >
              {posting ? "..." : "Post"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}