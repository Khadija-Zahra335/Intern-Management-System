"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Membership,
  Assignment,
  Submission,
  Feedback,
  LinkedInPost,
  Attendance,
  getCohortMembers,
  getAssignments,
  getSubmissions,
  getFeedback,
  getLinkedInPosts,
  getAttendance,
} from "@/lib/api";
import { OverviewTab } from "./OverviewTab";
import { SubmissionsTab } from "./SubmissionTab";
import { FeedbackTab } from "./FeedbackTab";
import { CheckinsTab } from "./CheckinsTab";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "submissions", label: "Submissions" },
  { key: "feedback", label: "Feedback" },
  { key: "checkins", label: "Check-ins" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function InternProgressPage() {
  const { id, membershipId } = useParams<{ id: string; membershipId: string }>();
  const [tab, setTab] = useState<TabKey>("overview");

  const [member, setMember] = useState<Membership | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pending, setPending] = useState<{ assignment: Assignment; submission: Submission }[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [linkedInPosts, setLinkedInPosts] = useState<LinkedInPost[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAll() {
    setLoading(true);
    try {
      const [members, memberAssignments, memberFeedback, posts, attendanceRecords] = await Promise.all([
        getCohortMembers(id),
        getAssignments(membershipId),
        getFeedback(membershipId),
        getLinkedInPosts(membershipId),
        getAttendance(membershipId),
      ]);
      setMember(members.find((m) => m.id === membershipId) ?? null);
      setAssignments(memberAssignments);
      setFeedback(memberFeedback);
      setLinkedInPosts(posts);
      setAttendance(attendanceRecords);

      const submitted = memberAssignments.filter((a) => a.status === "SUBMITTED");
      const pendingList = (
        await Promise.all(
          submitted.map(async (assignment) => {
            const submissions = await getSubmissions(assignment.id);
            return submissions.length > 0 ? { assignment, submission: submissions[0] } : null;
          })
        )
      ).filter((p): p is { assignment: Assignment; submission: Submission } => p !== null);
      setPending(pendingList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load progress");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [id, membershipId]);

  if (loading) return <p className="p-6 text-muted">Loading...</p>;

  const ratingHistory = feedback
    .slice()
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .map((f) => ({ weekNumber: f.weekNumber, rating: f.rating }));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href={`/cohorts/${id}`} className="text-sm text-primary hover:underline mb-4 inline-block">
        ← Back to cohort
      </Link>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-accent-soft text-primary flex items-center justify-center text-lg font-bold">
          {member?.user.name.charAt(0).toUpperCase() ?? "?"}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{member?.user.name ?? "Intern"}</h1>
          <p className="text-sm text-muted">{member?.user.email}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-accent-soft/60 p-1 rounded-lg mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              tab === t.key ? "bg-white text-primary shadow-sm" : "text-muted hover:text-foreground"
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
        <OverviewTab assignments={assignments} ratingHistory={ratingHistory} linkedInPosts={linkedInPosts} />
      )}
      {tab === "submissions" && <SubmissionsTab pending={pending} onReviewed={loadAll} />}
      {tab === "feedback" && <FeedbackTab membershipId={membershipId} feedback={feedback} onSaved={loadAll} />}
      {tab === "checkins" && <CheckinsTab assignments={assignments} attendance={attendance} />}
    </div>
  );
}