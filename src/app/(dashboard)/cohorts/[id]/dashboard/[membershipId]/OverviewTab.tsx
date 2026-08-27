import { Assignment, LinkedInPost } from "@/lib/api";
import { RatingTrendChart } from "@/components/RatingTrendChart";

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

// Not yet submitted/completed, and the task's own due date has fully
// passed (end of that calendar day) — same rule used everywhere else this
// is checked (intern pages, cohort progress table, dashboard stat tile).
function isOverdue(status: string, endDate: string | null): boolean {
  if (status === "COMPLETED" || status === "SUBMITTED") return false;
  if (!endDate) return false;
  const endOfDueDay = new Date(endDate);
  endOfDueDay.setHours(23, 59, 59, 999);
  return endOfDueDay < new Date();
}

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
  const overdueCount = assignments.filter((a) => isOverdue(a.status, a.task.endDate)).length;
  const avgRating =
    ratingHistory.length > 0 ? ratingHistory.reduce((sum, r) => sum + r.rating, 0) / ratingHistory.length : null;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatTile
          label="Task completion"
          value={`${percent}%`}
          hint={`${completed} of ${assignments.length} tasks`}
          swatch="bg-accent-soft text-primary"
          icon={IconChecklist}
        />
        <StatTile
          label="Overdue tasks"
          value={overdueCount}
          hint="Past due, not submitted"
          swatch="bg-red-50 text-red-600"
          icon={IconAlert}
        />
        <StatTile
          label="Avg rating"
          value={avgRating != null ? avgRating.toFixed(1) : "—"}
          hint={ratingHistory.length > 0 ? `${ratingHistory.length} week${ratingHistory.length === 1 ? "" : "s"} rated` : "No ratings yet"}
          swatch="bg-amber-50 text-amber-700"
          icon={IconStar}
        />
        <StatTile
          label="Latest rating"
          value={latestRating ? <StarRow rating={latestRating.rating} size="w-4 h-4" /> : "—"}
          hint={latestRating ? `Week ${latestRating.weekNumber}` : "No rating yet"}
          swatch="bg-amber-50 text-amber-700"
          icon={IconStar}
        />
        <StatTile
          label="LinkedIn cadence"
          value={linkedInWeeks.length}
          hint={linkedInWeeks.length === 0 ? "No posts logged" : `Weeks: ${linkedInWeeks.join(", ")}`}
          swatch="bg-green-50 text-green-700"
          icon={IconLink}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div>
          <h2 className="text-lg font-medium text-foreground mb-3">Tasks</h2>
          {assignments.length === 0 ? (
            <p className="text-muted">No tasks assigned yet.</p>
          ) : (
            <div className="bg-white border border-border rounded-2xl divide-y divide-border overflow-x-hidden overflow-y-auto max-h-[340px]">
              {assignments.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onSelectTask(a.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent-soft/40 transition-colors text-left"
                >
                  <p className="text-sm text-foreground">{a.task.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    {isOverdue(a.status, a.task.endDate) && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                        Overdue
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[a.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-medium text-foreground mb-3">Rating trend</h2>
          <div className="bg-white border border-border rounded-2xl p-4">
            <RatingTrendChart data={ratingHistory} height={200} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  swatch,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  swatch: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}) {
  return (
    <div className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3" title={hint}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${swatch}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted uppercase tracking-wide leading-snug">{label}</p>
        <div className="text-xl font-bold text-foreground leading-tight mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function IconChecklist({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="3" width="12" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.5 3V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 10l2 2 4-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAlert({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 6.5v4M10 13.2h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 2.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L10 2.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLink({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M8 12l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8.5 5.5H6a3.5 3.5 0 0 0 0 7h2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11.5 12.5H14a3.5 3.5 0 0 0 0-7h-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}