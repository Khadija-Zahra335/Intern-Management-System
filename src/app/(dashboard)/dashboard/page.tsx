"use client";

import { useEffect, useState } from "react";
import { formatDateRange } from "@/lib/format";
import Link from "next/link";
import {
    getDashboardSummary,
    getDashboardPendingReviews,
    DashboardSummary,
    PendingReview,
} from "@/lib/api";
import { CreateCohortForm } from "@/app/(dashboard)/cohorts/CreateCohortForm";
import { AssistantPanel } from "@/components/AssistantPanel";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
    const { user } = useAuth();
    const firstName = user?.name?.split(" ")[0] || "Mentor";
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [pending, setPending] = useState<PendingReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    async function loadAll() {
        setLoading(true);
        try {
            const [s, p] = await Promise.all([getDashboardSummary(), getDashboardPendingReviews()]);
            setSummary(s);
            setPending(p.items);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAll();
    }, []);

    if (loading) return <p className="text-sm text-muted">Loading...</p>;
    if (error)
        return (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        );
    if (!summary) return null;

    return (
        <div className="flex gap-6 items-start">
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Welcome back, {firstName} 👋</h1>
                        <p className="text-sm text-muted">Here&apos;s what&apos;s happening across your cohorts.</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5"
                    >
                        + New Cohort
                    </button>
                </div>

                {showForm && (
                    <CreateCohortForm
                        onCreated={() => {
                            setShowForm(false);
                            loadAll();
                        }}
                        onClose={() => setShowForm(false)}
                    />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <StatTile label="Active interns" value={summary.activeInterns} swatch="bg-accent-soft text-primary" icon={IconUsers} />
                    <StatTile
                        label="Tasks published"
                        value={summary.tasksPublishedThisWeek}
                        hint="This week across cohorts"
                        swatch="bg-blue-50 text-blue-600"
                        icon={IconChecklist}
                    />
                    <StatTile
                        label="Overdue tasks"
                        value={summary.overdueTasks}
                        hint="Not submitted, past due"
                        swatch="bg-red-50 text-red-600"
                        icon={IconAlert}
                    />
                    <StatTile
                        label="Avg. rating"
                        value={summary.avgRating ?? "—"}
                        swatch="bg-amber-50 text-amber-700"
                        icon={IconStar}
                    />
                    <StatTile
                        label="LinkedIn posts"
                        value={summary.linkedInPostsThisWeek}
                        hint="Logged this week"
                        swatch="bg-green-50 text-green-700"
                        icon={IconLink}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    <div className="lg:col-span-2 bg-white border border-border rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <h2 className="font-semibold text-foreground">Cohort Overview</h2>
                            <Link href="/cohorts" className="text-sm text-primary hover:underline">
                                View all cohorts →
                            </Link>
                        </div>
                        {summary.cohorts.length === 0 ? (
                            <p className="text-sm text-muted px-5 py-6">No cohorts yet.</p>
                        ) : (
                            <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
                                {summary.cohorts.map((c) => (
                                    <div key={c.id} className="px-5 py-5">
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="min-w-0">
                                                <Link href={`/cohorts/${c.id}`} className="font-semibold text-foreground hover:text-primary truncate block">
                                                    {c.name}
                                                </Link>
                                                <p className="text-xs text-muted mt-0.5">
                                                    {formatDateRange(c.startDate, c.endDate)}
                                                </p>
                                            </div>
                                            {c.status === "Active" ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-accent-soft text-primary shrink-0">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-500 shrink-0">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                    Archived
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-6">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-lg bg-accent-soft text-primary flex items-center justify-center shrink-0">
                                                    <IconUsers className="w-4.5 h-4.5" />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-bold text-foreground leading-none">{c.internsCount}</p>
                                                    <p className="text-[11px] text-muted mt-1">Interns</p>
                                                </div>
                                            </div>

                                                          <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                    <IconCalendar className="w-4.5 h-4.5" />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-bold text-foreground leading-none">{weeksBetween(c.startDate, c.endDate)}</p>
                                                    <p className="text-[11px] text-muted mt-1">Weeks</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <CircularProgress percent={c.taskCompletionPercent} colorClass="text-primary" />
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">{c.taskCompletionPercent}%</p>
                                                    <p className="text-xs text-muted">Task Completion</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <CircularProgress percent={c.linkedInCompletionPercent} colorClass="text-accent" />
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">{c.linkedInCompletionPercent}%</p>
                                                    <p className="text-xs text-muted">LinkedIn Goal</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="bg-white border border-border rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <h2 className="font-semibold text-foreground">Pending Reviews</h2>
                            {pending.length > 0 && (
                                <span className="bg-amber-50 text-amber-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                    {pending.length}
                                </span>
                            )}
                        </div>
                        {pending.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center px-6 py-10">
                                <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center mb-3">
                                    <IconClipboardCheck className="w-6 h-6 text-primary" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">You&apos;re all caught up!</p>
                                <p className="text-xs text-muted mt-1">Nothing waiting on review.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {pending.map((p) => (
                                    <div key={p.assignmentId} className="px-5 py-4">
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-7 h-7 rounded-full bg-accent-soft text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
                                                    {p.intern.name.charAt(0).toUpperCase()}
                                                </div>
                                                <p className="text-sm font-medium text-foreground truncate">{p.intern.name}</p>
                                            </div>
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 shrink-0">
                                                Pending
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted mb-1">Task: {p.task.title}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-xs text-muted">{new Date(p.submittedAt).toLocaleDateString()}</p>
                                            <Link
                                                href={`/cohorts/${p.cohort.id}/dashboard/${p.membershipId}?tab=submissions`}
                                                className="text-xs font-semibold text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-primary hover:text-white transition-colors"
                                            >
                                                Review
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AssistantPanel />
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
    value: string | number;
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
                <p className="text-xl font-bold text-foreground leading-tight mt-0.5">{value}</p>
            </div>
        </div>
    );
}



function weeksBetween(start: string, end: string) {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000)));
}

function CircularProgress({
    percent,
    colorClass,
    size = 56,
    strokeWidth = 6,
}: {
    percent: number;
    colorClass: string;
    size?: number;
    strokeWidth?: number;
}) {
    const clamped = Math.max(0, Math.min(100, percent));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clamped / 100) * circumference;

    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    fill="none"
                    stroke="currentColor"
                    className="text-border"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className={colorClass}
                    style={{ transition: "stroke-dashoffset 0.4s ease" }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-bold text-foreground">{clamped}%</span>
            </div>
        </div>
    );
}

function IconUsers({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
            <circle cx="7" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M2.5 16c0-2.8 2-4.5 4.5-4.5s4.5 1.7 4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="14" cy="7" r="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12.8 11.7c2.1.2 3.7 1.8 3.7 4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
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

function IconAlert({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10 6.5v4M10 13.2h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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


function IconCalendar({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3 8h14" stroke="currentColor" strokeWidth="1.6" />
            <path d="M6.5 2.5v3M13.5 2.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}
function IconClipboardCheck({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="3" width="12" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M7.5 3V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V3" stroke="currentColor" strokeWidth="1.6" />
            <path d="M6.5 10.2l2 2 4-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}