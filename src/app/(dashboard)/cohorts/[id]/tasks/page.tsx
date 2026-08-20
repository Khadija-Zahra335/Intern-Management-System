"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { getCohorts, getTasks, type Cohort, type Task } from "@/lib/api";

import { CreateTaskForm } from "./CreateTaskForm";
import { TaskList } from "./TaskList";
export default function CohortTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [cohorts, cohortTasks] = await Promise.all([getCohorts(), getTasks(id)]);
      setCohort(cohorts.find((c) => c.id === id) ?? null);
      setTasks(cohortTasks);
    } catch (err: any) {
      setError(err.message ?? "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <p className="p-6 text-muted">Loading tasks…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link href={`/cohorts/${id}`} className="text-sm text-accent hover:underline">
        ← Back to {cohort?.name ?? "cohort"}
      </Link>

      <div className="flex items-center justify-between mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Tasks</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          {showForm ? "Cancel" : "+ New Task"}
        </button>
      </div>

      {showForm && (
        <CreateTaskForm
          cohortId={id}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      <TaskList tasks={tasks} onChange={load} />
    </div>
  );
}