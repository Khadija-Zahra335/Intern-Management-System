"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Cohort,
  Membership,
  Assignment,
  Attendance,
  Activity,
  getCohorts,
  getCohortMembers,
  getAssignments,
  getAttendance,
  getActivity,
  postActivity,
} from "@/lib/api";

const ATTENDANCE_LABELS: Record<string, string> = {
  CHECK_IN: "Check in",
  CHECK_OUT: "Check out",
  LUNCH_START: "Lunch start",
  LUNCH_END: "Lunch end",
  AFK_START: "AFK start",
  AFK_END: "AFK end",
  RELAX_START: "Relax start",
  RELAX_END: "Relax end",
};

export default function CheckInsPage() {
  const { id } = useParams<{ id: string }>();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");

  const [activity, setActivity] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [newMessage, setNewMessage] = useState("");
  const [posting, setPosting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBase() {
      setLoading(true);
      try {
        const [cohorts, memberList] = await Promise.all([getCohorts(), getCohortMembers(id)]);
        setCohort(cohorts.find((c) => c.id === id) ?? null);
        setMembers(memberList);
        if (memberList.length > 0) setSelectedMemberId(memberList[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    loadBase();
  }, [id]);

  useEffect(() => {
    if (!selectedMemberId) return;

    async function loadMemberData() {
      setAttendanceLoading(true);
      try {
        const records = await getAttendance(selectedMemberId);
        setAttendance(records);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load attendance");
      } finally {
        setAttendanceLoading(false);
      }

      try {
        const memberAssignments = await getAssignments(selectedMemberId);
        setAssignments(memberAssignments);
        setSelectedAssignmentId(memberAssignments.length > 0 ? memberAssignments[0].id : "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      }
    }

    loadMemberData();
  }, [selectedMemberId]);

  useEffect(() => {
    if (!selectedAssignmentId) {
      setActivity([]);
      return;
    }

    async function loadActivity() {
      setActivityLoading(true);
      try {
        const entries = await getActivity(selectedAssignmentId);
        setActivity(entries);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activity");
      } finally {
        setActivityLoading(false);
      }
    }

    loadActivity();
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

  if (loading) return <p className="p-6 text-muted">Loading...</p>;

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-foreground mb-1">
        Check-ins {cohort ? `— ${cohort.name}` : ""}
      </h1>
      <p className="text-muted mb-6">Attendance history and per-task activity threads.</p>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-1">Member</label>
        <select
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          className="border border-border rounded-md px-3 py-2 w-full bg-white"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.user.name} ({m.user.email})
            </option>
          ))}
        </select>
      </div>

      <h2 className="text-lg font-medium text-foreground mb-2">
        Attendance {selectedMember ? `— ${selectedMember.user.name}` : ""}
      </h2>

      {attendanceLoading && <p className="text-muted mb-4">Loading attendance...</p>}

      {!attendanceLoading && attendance.length === 0 && (
        <p className="text-muted mb-6">No attendance logged yet.</p>
      )}

      {attendance.length > 0 && (
        <div className="bg-white border border-border rounded-2xl divide-y divide-border overflow-hidden mb-8">
          {attendance.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {ATTENDANCE_LABELS[a.type] ?? a.type}
                </p>
                {a.note && <p className="text-xs text-muted mt-0.5">{a.note}</p>}
              </div>
              <span className="text-xs text-muted">{new Date(a.occurredAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-medium text-foreground mb-2">Task activity</h2>

      {assignments.length === 0 ? (
        <p className="text-muted">No tasks assigned to this member yet.</p>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-1">Task</label>
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="border border-border rounded-md px-3 py-2 w-full bg-white"
            >
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.task.title} ({a.status})
                </option>
              ))}
            </select>
          </div>

          <div className="border border-border rounded-lg bg-white p-4 mb-4 space-y-3">
            {activityLoading && <p className="text-muted">Loading activity...</p>}

            {!activityLoading && activity.length === 0 && (
              <p className="text-muted text-sm">No activity posted yet.</p>
            )}

            {activity.map((entry) => (
              <div key={entry.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-medium text-foreground">
                    {entry.author.name}{" "}
                    <span className="text-xs text-muted">({entry.author.role.toLowerCase()})</span>
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{entry.content}</p>
                {entry.links.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {entry.links.map((link) => (
                      <li key={link}>
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline text-sm"
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={2}
              placeholder="Ask a question or post an update..."
              className="border border-border rounded-md px-3 py-2 flex-1"
            />
            <button
              onClick={handlePost}
              disabled={posting || !newMessage.trim()}
              className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-hover disabled:opacity-50 self-end"
            >
              {posting ? "Posting..." : "Post"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}