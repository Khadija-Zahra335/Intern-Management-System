"use client";

import { useState } from "react";
import { publishTask, updateTask, deleteTask, type Task } from "@/lib/api";

export function TaskList({ tasks, onChange }: { tasks: Task[]; onChange: () => void }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-muted">No tasks yet for this cohort.</p>;
  }

  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} onChange={onChange} />
      ))}
    </ul>
  );
}

function TaskRow({ task, onChange }: { task: Task; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handlePublish() {
    setBusy(true);
    setError("");
    try {
      await publishTask(task.id);
      onChange();
    } catch (err: any) {
      setError(err.message ?? "Failed to publish");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${task.title}"? This can't be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteTask(task.id);
      onChange();
    } catch (err: any) {
      setError(err.message ?? "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <EditTaskRow
        task={task}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          onChange();
        }}
      />
    );
  }

  return (
    <li className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground">{task.title}</h3>
            <span
              className={`text-xs rounded-full px-2 py-0.5 ${
                task.state === "PUBLISHED" ? "bg-accent-soft text-primary" : "bg-gray-100 text-muted"
              }`}
            >
              {task.state}
            </span>
          </div>
          <p className="text-sm text-muted mt-1">{task.description}</p>
          <p className="text-xs text-muted mt-2">
            {task.startDate.slice(0, 10)} → {task.endDate.slice(0, 10)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {task.state === "DRAFT" && (
            <>
              <button
                onClick={handlePublish}
                disabled={busy}
                className="text-sm rounded-lg bg-primary px-3 py-1.5 text-white hover:bg-primary-hover disabled:opacity-50"
              >
                Publish
              </button>
              <button onClick={() => setEditing(true)} disabled={busy} className="text-sm text-accent hover:underline">
                Edit
              </button>
              <button onClick={handleDelete} disabled={busy} className="text-sm text-red-600 hover:underline">
                Delete
              </button>
            </>
          )}

          {task.state === "PUBLISHED" && (
            <button onClick={() => setEditing(true)} disabled={busy} className="text-sm text-accent hover:underline">
              Extend deadline
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </li>
  );
}

function EditTaskRow({
  task,
  onCancel,
  onSaved,
}: {
  task: Task;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const isPublished = task.state === "PUBLISHED";

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [startDate, setStartDate] = useState(task.startDate.slice(0, 10));
  const [endDate, setEndDate] = useState(task.endDate.slice(0, 10));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (isPublished) {
        await updateTask(task.id, { endDate });
      } else {
        await updateTask(task.id, { title, description, startDate, endDate });
      }
      onSaved();
    } catch (err: any) {
      setError(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-xl border border-accent bg-accent-soft p-4 space-y-3">
      {!isPublished && (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={isPublished}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {isPublished && (
        <p className="text-xs text-muted">This task is published — only the end date can be changed.</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm rounded-lg bg-primary px-3 py-1.5 text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="text-sm text-muted hover:underline">
          Cancel
        </button>
      </div>
    </li>
  );
}