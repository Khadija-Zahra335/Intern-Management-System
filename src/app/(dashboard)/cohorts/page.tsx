"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboardSummary, DashboardCohortProgress } from "@/lib/api";
import { CreateCohortForm } from "@/app/(dashboard)/cohorts/CreateCohortForm";
import { formatDateRange } from "@/lib/format";

type StatusFilter = "all" | "Active" | "Archived";

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<DashboardCohortProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");

  async function loadCohorts() {
    setLoading(true);
    try {
      const summary = await getDashboardSummary();
      setCohorts(summary.cohorts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cohorts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCohorts();
  }, []);

  const visible = filter === "all" ? cohorts : cohorts.filter((c) => c.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cohorts</h1>
          <p className="text-sm text-muted">Manage intern batches across time.</p>
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
            loadCohorts();
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      <div className="flex gap-1 bg-accent-soft/60 p-1 rounded-lg mb-6 w-fit">
        {(["all", "Active", "Archived"] as StatusFilter[]).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === key ? "bg-white text-primary shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {key === "all" ? "All Cohorts" : key}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted">
          {cohorts.length === 0 ? "No cohorts yet. Create your first one above." : "No cohorts match this filter."}
        </p>
      ) : (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-muted uppercase tracking-wide bg-accent-soft/30">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Interns</th>
                  <th className="px-5 py-3">Task Completion</th>
                  <th className="px-5 py-3">LinkedIn</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((cohort) => (
                  <tr key={cohort.id} className="hover:bg-accent-soft/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-foreground whitespace-nowrap">{cohort.name}</td>
                    <td className="px-5 py-4 text-muted whitespace-nowrap">
                      {/* {new Date(cohort.startDate).toLocaleDateString()} – {new Date(cohort.endDate).toLocaleDateString()} */}
                      {formatDateRange(cohort.startDate, cohort.endDate)}
                    </td>
                    <td className="px-5 py-4 text-foreground">{cohort.internsCount}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 w-36">
                        <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${cohort.taskCompletionPercent}%` }} />
                        </div>
                        <span className="text-xs text-muted w-9 text-right">{cohort.taskCompletionPercent}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 w-36">
                        <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${cohort.linkedInCompletionPercent}%` }} />
                        </div>
                        <span className="text-xs text-muted w-9 text-right">{cohort.linkedInCompletionPercent}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {cohort.status === "Active" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-green-50 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <Link
                        href={`/cohorts/${cohort.id}`}
                        className="inline-block text-xs font-semibold text-foreground border border-border rounded-lg px-4 py-2 hover:border-primary hover:text-primary transition-colors"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}