"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Cohort,
  Membership,
  Assignment,
  Submission,
  Feedback,
  LinkedInPost,
  Attendance,
  getCohorts,
  getCohortMembers,
  getAssignments,
  getSubmissions,
  getFeedback,
  getLinkedInPosts,
  getAttendance,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import { OverviewTab } from "./OverviewTab";
import { SubmissionsTab } from "./SubmissionTab";
import { FeedbackTab } from "./FeedbackTab";
import { CheckinsTab } from "./CheckinsTab";
import { TaskActivityTab } from "./TaskActivityTab";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "activity", label: "Task Activity" },
  { key: "submissions", label: "Submissions" },
  { key: "feedback", label: "Feedback" },
  { key: "checkins", label: "Attendance" },
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

  export default function InternProgressPage() {
  const { id, membershipId } = useParams<{ id: string; membershipId: string }>();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabKey>(() => {
    const requested = searchParams.get("tab");
    return TABS.some((t) => t.key === requested) ? (requested as TabKey) : "overview";
  });
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [member, setMember] = useState<Membership | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissionHistory, setSubmissionHistory] = useState<{ assignment: Assignment; submission: Submission }[]>([]);
  const [pending, setPending] = useState<{ assignment: Assignment; submission: Submission }[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [linkedInPosts, setLinkedInPosts] = useState<LinkedInPost[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAll() {
    setLoading(true);
    try {
      const [cohorts, members, memberAssignments, memberFeedback, posts, attendanceRecords] = await Promise.all([
        getCohorts(),
        getCohortMembers(id),
        getAssignments(membershipId),
        getFeedback(membershipId),
        getLinkedInPosts(membershipId),
        getAttendance(membershipId),
      ]);
      setCohort(cohorts.find((c) => c.id === id) ?? null);
      setMember(members.find((m) => m.id === membershipId) ?? null);
      setAssignments(memberAssignments);
      setFeedback(memberFeedback);
      setLinkedInPosts(posts);
      setAttendance(attendanceRecords);

      const submissionsByAssignment = await Promise.all(
        memberAssignments.map(async (assignment) => {
          const submissions = await getSubmissions(assignment.id);
          return submissions.map((submission) => ({ assignment, submission }));
        })
      );
      const history = submissionsByAssignment
        .flat()
        .sort((a, b) => new Date(b.submission.submittedAt).getTime() - new Date(a.submission.submittedAt).getTime());

      setSubmissionHistory(history);
      setPending(history.filter((h) => h.submission.reviewedAt === null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load progress");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [id, membershipId]);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  const ratingHistory = feedback
    .slice()
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .map((f) => ({ weekNumber: f.weekNumber, rating: f.rating }));

  const completed = assignments.filter((a) => a.status === "COMPLETED").length;
  const taskPercent = assignments.length > 0 ? Math.round((completed / assignments.length) * 100) : 0;
  const avgRating =
    feedback.length > 0 ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length : null;

  const palette = avatarPalette(membershipId);

  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm mb-6">
        <Link href="/cohorts" className="text-muted hover:text-primary">Cohorts</Link>
        <span className="text-muted">›</span>
        <Link href={`/cohorts/${id}`} className="text-muted hover:text-primary">
          {cohort?.name ?? "Cohort"}
        </Link>
        <span className="text-muted">›</span>
        <span className="text-foreground font-semibold">{member?.user.name ?? "Intern"}</span>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="bg-white border border-border rounded-2xl p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full ${palette.bg} ${palette.text} flex items-center justify-center text-xl font-bold shrink-0`}>
              {member?.user.name.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{member?.user.name ?? "Intern"}</h1>
              <p className="text-sm text-muted">{member?.user.email}</p>
              <p className="text-xs text-muted mt-0.5">
                {cohort?.name ?? "—"} · Joined {member ? formatDate(member.joinedAt) : "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{taskPercent}%</p>
              <p className="text-xs text-muted">Tasks</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{avgRating !== null ? avgRating.toFixed(1) : "—"}</p>
              <p className="text-xs text-muted">Avg rating</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{linkedInPosts.length}</p>
              <p className="text-xs text-muted">LinkedIn</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{pending.length}</p>
              <p className="text-xs text-muted">Pending</p>
            </div>
            <button
              onClick={() => setTab("feedback")}
              className="rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5"
            >
              Give Feedback
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-accent-soft/60 p-1 rounded-lg mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === t.key ? "bg-white text-primary shadow-sm" : "text-muted hover:text-foreground"
              }`}
          >
            {t.label}
            {t.key === "submissions" && pending.length > 0 && (
              <span className="bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab
          assignments={assignments}
          ratingHistory={ratingHistory}
          linkedInPosts={linkedInPosts}
          onSelectTask={(assignmentId) => {
            setActiveAssignmentId(assignmentId);
            setTab("activity");
          }}
        />
      )}
      {tab === "activity" && (
        <TaskActivityTab
          assignments={assignments}
          selectedAssignmentId={activeAssignmentId}
          onSelect={setActiveAssignmentId}
        />
      )}
      {tab === "submissions" && (
        <SubmissionsTab
          history={submissionHistory}
          onReviewed={loadAll}
          internName={member?.user.name ?? "Intern"}
          internEmail={member?.user.email ?? ""}
        />
      )}
      {tab === "feedback" && (
        <FeedbackTab membershipId={membershipId} feedback={feedback} assignments={assignments} onSaved={loadAll} />
      )}
     {tab === "checkins" && (
  <CheckinsTab membershipId={membershipId} attendance={attendance} onChanged={loadAll} />
)}
    </div>
  );
}