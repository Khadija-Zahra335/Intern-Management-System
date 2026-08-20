"use client";

import { useState } from "react";
import { createCohort } from "@/lib/api";

export function CreateCohortForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createCohort({ name, startDate, endDate });
      setName("");
      setStartDate("");
      setEndDate("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create cohort");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 mb-6">
      <h2 className="font-semibold text-foreground mb-4">New cohort</h2>
      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}
      <label className="block text-sm font-medium text-foreground mb-1.5">Cohort name</label>
      <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Fall 2026 Intern Cohort"
        className="w-full mb-4 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Start date</label>
          <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">End date</label>
          <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
        </div>
      </div>
      <button type="submit" disabled={submitting}
        className="rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-5 py-2.5 disabled:opacity-60">
        {submitting ? "Creating..." : "Create cohort"}
      </button>
    </form>
  );
}