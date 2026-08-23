// src/app/(dashboard)/tasks/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCohorts, type Cohort } from "@/lib/api";
import { formatDateRange } from "@/lib/format";

export default function TasksCohortPickerPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        setCohorts(await getCohorts());
      } catch (err: any) {
        setError(err.message ?? "Failed to load cohorts");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
        <p className="text-sm text-muted">Select a cohort to view, create, and manage its tasks.</p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading cohorts…</p>
      ) : cohorts.length === 0 ? (
        <p className="text-sm text-muted">No cohorts yet — create one from the Cohorts page first.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cohorts.map((cohort) => (
            <Link
              key={cohort.id}
              href={`/cohorts/${cohort.id}/tasks`}
              className="group bg-white border border-border rounded-2xl p-6 hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 rounded-full bg-accent-soft text-primary flex items-center justify-center font-bold text-lg">
                  {cohort.name.charAt(0).toUpperCase()}
                </div>
                {cohort.isActive ? (
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
              </div>

              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors mb-1">
                {cohort.name}
              </h3>
              <p className="text-sm text-muted mb-3">
                {formatDateRange(cohort.startDate, cohort.endDate)}
              </p>
              <p className="text-xs font-semibold text-primary flex items-center gap-1">
                View tasks
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 10h12M12 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}