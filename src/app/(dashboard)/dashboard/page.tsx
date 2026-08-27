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

export default function DashboardPage() {
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
                        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                        <p className="text-sm text-muted">Overview across all cohorts.</p>
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
                            <h2 className="font-semibold text-foreground">Cohort progress</h2>
                            <Link href="/cohorts" className="text-sm text-primary hover:underline">
                                View all →
                            </Link>
                        </div>
                        {summary.cohorts.length === 0 ? (
                            <p className="text-sm text-muted px-5 py-6">No cohorts yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs font-medium text-muted uppercase tracking-wide">
                                            <th className="px-3 py-2.5">Cohort</th>
                                            <th className="px-3 py-2.5">Interns</th>
                                            <th className="px-3 py-2.5">Task completion</th>
                                            <th className="px-3 py-2.5">LinkedIn</th>
                                            <th className="px-3 py-2.5">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {summary.cohorts.map((c) => (
                                            <tr key={c.id}>
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <Link href={`/cohorts/${c.id}`} className="font-medium text-foreground hover:text-primary">
                                                        {c.name}
                                                    </Link>
                                                    <p className="text-xs text-muted mt-0.5">
                                                        {formatDateRange(c.startDate, c.endDate)}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-3 text-foreground">{c.internsCount}</td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-1.5 w-20">
                                                        <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
                                                            <div className="h-full bg-primary rounded-full" style={{ width: `${c.taskCompletionPercent}%` }} />
                                                        </div>
                                                        <span className="text-xs text-muted w-8 text-right">{c.taskCompletionPercent}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-1.5 w-20">
                                                        <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
                                                            <div className="h-full bg-accent rounded-full" style={{ width: `${c.linkedInCompletionPercent}%` }} />
                                                        </div>
                                                        <span className="text-xs text-muted w-8 text-right">{c.linkedInCompletionPercent}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    {c.status === "Active" ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-accent-soft text-primary">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-500">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                            Archived
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    <div className="bg-white border border-border rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <h2 className="font-semibold text-foreground">Pending reviews</h2>
                            {pending.length > 0 && (
                                <span className="bg-amber-50 text-amber-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                    {pending.length}
                                </span>
                            )}
                        </div>
                        {pending.length === 0 ? (
                            <p className="text-sm text-muted px-5 py-6">Nothing waiting on review.</p>
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
        <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-muted uppercase tracking-wide">{label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${swatch}`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {hint && <p className="text-xs text-muted mt-2">{hint}</p>}
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