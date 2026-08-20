"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getCohorts, getCohortMembers, Cohort, Membership } from "@/lib/api";
import { AddMemberForm } from "@/app/(dashboard)/cohorts/[id]/AddMemberForm";


export default function CohortDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [cohorts, memberList] = await Promise.all([getCohorts(), getCohortMembers(id)]);
      setCohort(cohorts.find((c) => c.id === id) ?? null);
      setMembers(memberList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cohort");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) return <p className="text-sm text-muted">Loading...</p>;

  if (error) {
    return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>;
  }

  return (
    <div>
      <Link href="/cohorts" className="text-sm text-primary hover:underline mb-4 inline-block">
        ← All cohorts
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{cohort?.name ?? "Cohort"}</h1>
          {cohort && (
            <p className="text-sm text-muted">
              {new Date(cohort.startDate).toLocaleDateString()} – {new Date(cohort.endDate).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {cohort && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cohort.isActive ? "bg-accent-soft text-primary" : "bg-gray-100 text-gray-500"}`}>
              {cohort.isActive ? "Active" : "Archived"}
            </span>
          )}
          <Link
            href={`/cohorts/${id}/tasks`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white transition-colors"
          >
            Manage tasks
            
          </Link>
        </div>
      </div>
      

      <AddMemberForm cohortId={id} existingEmails={members.map((m) => m.user.email)} onAdded={loadData} />

      <h2 className="font-semibold text-foreground mb-3">Members ({members.length})</h2>

      {members.length === 0 ? (
        <p className="text-sm text-muted">No interns added yet.</p>
      ) : (
        <div className="bg-white border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-semibold text-foreground">{m.user.name}</p>
                <p className="text-xs text-muted mt-0.5">{m.user.email}</p>
              </div>
              <p className="text-xs text-muted">Joined {new Date(m.joinedAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}