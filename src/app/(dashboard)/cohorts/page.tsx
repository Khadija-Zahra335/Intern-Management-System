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
      <div className="flex items-center justify-between mb-6">
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
        <div className="bg-white border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {cohorts.map((cohort) => (
            <Link key={cohort.id} href={`/cohorts/${cohort.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-accent-soft transition-colors">
              <div>
                <p className="font-semibold text-foreground">{cohort.name}</p>
                <p className="text-xs text-muted mt-0.5">
                  {new Date(cohort.startDate).toLocaleDateString()} – {new Date(cohort.endDate).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cohort.isActive ? "bg-accent-soft text-primary" : "bg-gray-100 text-gray-500"}`}>
                {cohort.isActive ? "Active" : "Archived"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}