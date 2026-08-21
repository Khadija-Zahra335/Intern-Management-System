"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCohorts, Cohort } from "@/lib/api";
import { CreateCohortForm } from "@/app/(dashboard)/cohorts/CreateCohortForm";

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCohorts() {
    setLoading(true);
    try {
      setCohorts(await getCohorts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cohorts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCohorts();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cohorts</h1>
          <p className="text-sm text-muted">Manage intern batches across time.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5">
          {showForm ? "Cancel" : "New Cohort"}
        </button>
      </div>

      {showForm && <CreateCohortForm onCreated={() => { setShowForm(false); loadCohorts(); }} />}

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : cohorts.length === 0 ? (
        <p className="text-sm text-muted">No cohorts yet. Create your first one above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cohorts.map((cohort) => {
            const weeks = Math.max(
              1,
              Math.round(
                (new Date(cohort.endDate).getTime() - new Date(cohort.startDate).getTime()) /
                  (7 * 24 * 60 * 60 * 1000)
              )
            );

            return (
              <Link
                key={cohort.id}
                href={`/cohorts/${cohort.id}`}
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
                  {new Date(cohort.startDate).toLocaleDateString()} – {new Date(cohort.endDate).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted">{weeks}-week program</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}