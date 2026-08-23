"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCohorts, getTasks, updateTask, publishTask, generateTaskDraft, type Cohort, type Task } from "@/lib/api";
import { MarkdownText } from "@/components/MarkdownText";

const WRITING_TIPS = [
  "Start with a clear verb: Build, Design, Implement, Document",
  "List specific deliverables — not just topics",
  "Include acceptance criteria so interns know when they're done",
  "Mention what tools or constraints apply",
];

export default function EditTaskPage({ params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = use(params);
  const router = useRouter();

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const [error, setError] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [cohorts, tasks] = await Promise.all([getCohorts(), getTasks(id)]);
        const foundCohort = cohorts.find((c) => c.id === id) ?? null;
        const foundTask = tasks.find((t) => t.id === taskId) ?? null;
        setCohort(foundCohort);
        setTask(foundTask);
        if (foundTask) {
          setTitle(foundTask.title);
          setDescription(foundTask.description);
          setStartDate(foundTask.startDate.slice(0, 10));
          setEndDate(foundTask.endDate.slice(0, 10));
        }
      } catch (err: any) {
        setLoadError(err.message ?? "Failed to load task");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, taskId]);

  async function handleGenerate() {
    if (!topic.trim()) {
      setGenError("Describe what the task should cover first.");
      return;
    }
    setGenError("");
    setGenerating(true);
    try {
      const draft = await generateTaskDraft(topic.trim());
      setTitle(draft.title);
      setDescription(draft.description);
      setShowPreview(true);
    } catch (err: any) {
      setGenError(err.message ?? "Failed to generate a draft.");
    } finally {
      setGenerating(false);
    }
  }

  const isPublished = task?.state === "PUBLISHED";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSavingDraft(true);
    try {
      if (isPublished) {
        await updateTask(taskId, { endDate });
      } else {
        await updateTask(taskId, { title, description, startDate, endDate });
      }
      router.push(`/cohorts/${id}/tasks/${taskId}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to save");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handlePublish(e: React.MouseEvent) {
    e.preventDefault();
    setError("");
    setPublishing(true);
    try {
      await updateTask(taskId, { title, description, startDate, endDate });
      await publishTask(taskId);
      router.push(`/cohorts/${id}/tasks/${taskId}`);
    } catch (err: any) {
      setError(err.message ?? "Changes were saved, but publishing failed — you can publish from the task page.");
    } finally {
      setPublishing(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (loadError || !task) {
    return (
      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
        {loadError || "Task not found."}
      </p>
    );
  }

  const busy = savingDraft || publishing;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm mb-6">
        <Link href={`/cohorts/${id}/tasks`} className="text-muted hover:text-primary">
          {cohort?.name ?? "Cohort"}
        </Link>
        <span className="text-muted">›</span>
        <span className="text-foreground font-semibold">Edit Task</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <form onSubmit={handleSave} className="lg:col-span-2 bg-white border border-border rounded-2xl p-6 space-y-4">
          {isPublished && (
            <p className="text-sm text-muted bg-accent-soft/60 rounded-lg px-3 py-2">
              This task is published — only the end date can be changed.
            </p>
          )}

          {!isPublished && (
            <>
              <div className="rounded-xl border border-dashed border-accent bg-accent-soft/40 p-4 space-y-2">
                <label className="block text-sm font-medium text-foreground">AI-Assisted Draft</label>
                <p className="text-xs text-muted">Describe the task in plain language and generate a draft.</p>
                <div className="flex gap-2">
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. build a rate-limited authentication endpoint with refresh tokens"
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 shrink-0"
                  >
                    {generating ? "Generating…" : "Generate Draft"}
                  </button>
                </div>
                {genError && <p className="text-sm text-red-600">{genError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Task title <span className="text-red-500">*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-foreground">Description</label>
                  <button
                    type="button"
                    onClick={() => setShowPreview((v) => !v)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {showPreview ? "Edit raw text" : "Preview formatting"}
                  </button>
                </div>
                {showPreview ? (
                  <div className="w-full rounded-lg border border-border px-3 py-2 min-h-[140px] bg-gray-50">
                    <MarkdownText content={description} />
                  </div>
                ) : (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={8}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
                  />
                )}
                <p className="text-xs text-muted mt-1">Supports Markdown with bullet points and numbered lists.</p>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isPublished}
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <Link
              href={`/cohorts/${id}/tasks/${taskId}`}
              className="rounded-lg border border-border text-foreground text-sm font-semibold px-4 py-2.5 hover:bg-accent-soft/60 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg border border-border text-foreground text-sm font-semibold px-4 py-2.5 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              {savingDraft ? "Saving…" : isPublished ? "Save changes" : "Save as Draft"}
            </button>
            {!isPublished && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={busy}
                className="rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5 disabled:opacity-50"
              >
                {publishing ? "Publishing…" : "Publish to Cohort"}
              </button>
            )}
          </div>
        </form>

        {!isPublished && (
          <div className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Writing tips</h2>
            <ol className="space-y-3">
              {WRITING_TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted">
                  <span className="w-5 h-5 rounded-full bg-accent-soft text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {tip}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}