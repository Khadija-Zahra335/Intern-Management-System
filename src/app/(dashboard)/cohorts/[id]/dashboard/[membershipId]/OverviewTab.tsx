import { Assignment, LinkedInPost } from "@/lib/api";
import { RatingTrendChart } from "./RatingTrendCharter";

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

function StarRow({ rating, size = "w-5 h-5" }: { rating: number; size?: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 20 20" className={`${size} ${n <= rating ? "fill-primary" : "fill-border"}`}>
          <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6.1L10 14.9l-5.4 3 1.3-6.1L1.3 7.7l6.1-.6L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

export function OverviewTab({
  assignments,
  ratingHistory,
  linkedInPosts,
  onSelectTask,
}: {
  assignments: Assignment[];
  ratingHistory: { weekNumber: number; rating: number }[];
  linkedInPosts: LinkedInPost[];
  onSelectTask: (assignmentId: string) => void;
}) {
  const completed = assignments.filter((a) => a.status === "COMPLETED").length;
  const percent = assignments.length > 0 ? Math.round((completed / assignments.length) * 100) : 0;
  const linkedInWeeks = Array.from(new Set(linkedInPosts.map((p) => p.weekNumber))).sort((a, b) => a - b);
  const latestRating = ratingHistory.length > 0 ? ratingHistory[ratingHistory.length - 1] : null;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Task completion</p>
          <p className="text-3xl font-bold text-foreground">{percent}%</p>
          <div className="h-1.5 rounded-full bg-border overflow-hidden mt-3">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-muted mt-2">
            {completed} of {assignments.length} tasks
          </p>
        </div>

        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Latest rating</p>
          {latestRating ? (
            <>
              <StarRow rating={latestRating.rating} />
              <p className="text-xs text-muted mt-3">Week {latestRating.weekNumber}</p>
            </>
          ) : (
            <p className="text-sm text-muted mt-1">No rating yet</p>
          )}
        </div>

        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">LinkedIn cadence</p>
          <p className="text-3xl font-bold text-foreground">{linkedInWeeks.length}</p>
          <p className="text-xs text-muted mt-2">
            {linkedInWeeks.length === 0 ? "No posts logged" : `week${linkedInWeeks.length === 1 ? "" : "s"}: ${linkedInWeeks.join(", ")}`}
          </p>
        </div>
      </div>

      <h2 className="text-lg font-medium text-foreground mb-3">Tasks</h2>
      {assignments.length === 0 ? (
        <p className="text-muted mb-8">No tasks assigned yet.</p>
      ) : (
        <div className="bg-white border border-border rounded-2xl divide-y divide-border overflow-hidden mb-8">
          {assignments.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelectTask(a.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent-soft/40 transition-colors text-left"
            >
              <p className="text-sm text-foreground">{a.task.title}</p>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[a.status] ?? "bg-gray-100 text-gray-500"}`}>
                {STATUS_LABELS[a.status] ?? a.status}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="bg-white border border-border rounded-2xl p-5">
        <h2 className="text-lg font-medium text-foreground mb-3">Rating trend</h2>
        <RatingTrendChart data={ratingHistory} />
      </div>
    </div>
  );
}