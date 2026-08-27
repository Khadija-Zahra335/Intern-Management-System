"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { getCohorts, getTasks, type Cohort, type Task } from "@/lib/api";
import { markdownPreview } from "@/components/MarkdownText";

import { CreateTaskForm } from "./CreateTaskForm";

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

  if (loading) return <p className="text-sm text-muted">Loading tasks…</p>;
  if (error) return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm text-muted mb-2">
        <Link href="/cohorts" className="hover:text-primary">Cohorts</Link>
        <span>›</span>
        <Link href={`/cohorts/${id}`} className="hover:text-primary">{cohort?.name ?? "Cohort"}</Link>
        <span>›</span>
        <span className="text-foreground font-medium">Tasks</span>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-6">New Task Creator</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          {cohort && cohort.isActive ? (
            <CreateTaskForm cohortId={id} cohort={cohort} onCreated={load} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-white p-6">
              <p className="text-sm font-semibold text-foreground mb-1">This cohort is archived</p>
              <p className="text-sm text-muted">New tasks can't be created here. Existing tasks are still listed for reference.</p>
            </div>
          )}
        </div>
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Recent Tasks</h2>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted px-5 py-6">No tasks yet for this cohort.</p>
          ) : (
            <div className="divide-y divide-border">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/cohorts/${id}/tasks/${task.id}`}
                  className="block px-5 py-4 hover:bg-accent-soft/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground">{task.title}</p>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${task.state === "PUBLISHED" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                    >
                      {task.state === "PUBLISHED" ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="text-xs text-muted line-clamp-1">{markdownPreview(task.description)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}