"use client";

import { useState } from "react";
import { createTask, publishTask, generateTaskDraft, type Cohort } from "@/lib/api";


import { MarkdownText } from "@/components/MarkdownText";
import { formatDateRange } from "@/lib/format";

const MAX_TOPIC_LENGTH = 300;

export function CreateTaskForm({
  cohortId,
  cohort,
  onCreated,
}: {
  cohortId: string;
  cohort: Pick<Cohort, "startDate" | "endDate">;
  onCreated: () => void;
}) {
  // Task dates must fall inside the cohort's own program dates — enforced
  // server-side (see POST /api/tasks), these are just min/max on the
  // pickers so a mentor doesn't hit the error after filling out the form.
  const cohortStartDay = cohort.startDate.slice(0, 10);
  const cohortEndDay = cohort.endDate.slice(0, 10);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [isAiDraft, setIsAiDraft] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
      setIsAiDraft(true);
      setShowPreview(true);
    } catch (err: any) {
      setGenError(err.message ?? "Failed to generate a draft. You can still write the task manually below.");
    } finally {
      setGenerating(false);
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setTopic("");
    setIsAiDraft(false);
    setShowPreview(false);
  }

  async function handleSaveAsDraft(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSavingDraft(true);
    try {
      await createTask({ cohortId, title, description, startDate, endDate });
      resetForm();
      onCreated();
    } catch (err: any) {
      setError(err.message ?? "Failed to create task");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleCreateAndPublish(e: React.MouseEvent) {
    e.preventDefault();
    setError("");
    setPublishing(true);
    try {
      const task = await createTask({ cohortId, title, description, startDate, endDate });
      await publishTask(task.id);
      resetForm();
      onCreated();
    } catch (err: any) {
      setError(err.message ?? "Task was saved as a draft, but publishing failed — you can publish it from the task list.");
    } finally {
      setPublishing(false);
    }
  }

  const busy = savingDraft || publishing;

  return (
    <form onSubmit={handleSaveAsDraft} className="rounded-2xl border border-border bg-white p-4 space-y-3">
      <div className="rounded-xl border border-dashed border-accent bg-accent-soft/40 p-3 space-y-1.5">
        <label className="block text-xs font-medium text-foreground">Draft with AI (optional)</label>
        <p className="text-xs text-muted">
          Describe the topic in plain language and get a structured draft — Overview, Hands-on, Deliverable —
          that you can edit before saving.
        </p>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value.slice(0, MAX_TOPIC_LENGTH))}
          maxLength={MAX_TOPIC_LENGTH}
          rows={2}
          placeholder="e.g. Intro to REST API design — teach them how to structure endpoints and status codes"
          className="w-full rounded-lg border border-border px-3 py-1.5 text-xs bg-white"
        />
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate Draft"}
          </button>
          <span className="text-xs text-muted">{topic.length}/{MAX_TOPIC_LENGTH}</span>
        </div>
        {genError && <p className="text-xs text-red-600">{genError}</p>}
      </div>

      {isAiDraft && (
        <p className="text-xs font-medium text-accent bg-accent-soft inline-block rounded-full px-2.5 py-1">
          AI draft — review and edit before saving
        </p>
      )}
      {isAiDraft && (
        <p className="text-xs text-muted">
          AI can make mistakes — check the details, dates, and technical accuracy before publishing.
        </p>
      )}

      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Task title</label>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setIsAiDraft(false);
          }}
          required
          className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-foreground">Description</label>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {showPreview ? "Edit raw text" : "Preview formatting"}
          </button>
        </div>

        {showPreview ? (
          <div className="w-full rounded-lg border border-border px-3 py-2 min-h-[80px] bg-gray-50 text-sm">
            {description ? <MarkdownText content={description} /> : <p className="text-sm text-muted">Nothing to preview yet.</p>}
          </div>
        ) : (
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setIsAiDraft(false);
            }}
            required
            rows={6}
            placeholder={"## Overview\n...\n\n## Hands-on\n- ...\n\n## Deliverable\n..."}
            className="w-full rounded-lg border border-border px-3 py-2 text-xs font-mono"
          />
        )}
        <p className="text-xs text-muted mt-1">
          Supports Markdown: <code>## Heading</code>, <code>- bullet</code>, <code>**bold**</code>.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={cohortStartDay}
            max={cohortEndDay}
            required
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={cohortStartDay}
            max={cohortEndDay}
            required
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
          />
        </div>
        <p className="col-span-2 text-xs text-muted -mt-2">
          Must fall within the cohort&apos;s program dates: {formatDateRange(cohort.startDate, cohort.endDate)}.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg border border-border text-foreground text-sm font-semibold px-4 py-2.5 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
        >
          {savingDraft ? "Saving…" : "Save as Draft"}
        </button>
        <button
          type="button"
          onClick={handleCreateAndPublish}
          disabled={busy}
          className="rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5 disabled:opacity-50"
        >
          {publishing ? "Publishing…" : "Create & Publish"}
        </button>
      </div>
    </form>
  );
}