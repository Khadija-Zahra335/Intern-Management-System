"use client";

import { useEffect, useRef, useState } from "react";
import {
  getMyMemberships,
  getLinkedInPosts,
  logLinkedInPost,
  LinkedInPost,
  MyMembership,
} from "@/lib/api";
import { computeWeekNumber } from "@/lib/weeks";

export default function LinkedInPage() {
  const [membership, setMembership] = useState<MyMembership | null>(null);
  const [posts, setPosts] = useState<LinkedInPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [weekNumber, setWeekNumber] = useState(1);
  const [url, setUrl] = useState("");
  const urlInputRef = useRef<HTMLInputElement>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const memberships = await getMyMemberships();
      const active = memberships.find((m) => m.isActive) ?? memberships[0] ?? null;
      setMembership(active);
      if (active) {
        const data = await getLinkedInPosts(active.id);
        setPosts(data);
        setWeekNumber((w) => (w === 1 ? computeWeekNumber(active.cohort.startDate, new Date().toISOString()) : w));
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to load LinkedIn posts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!membership) return;
    if (!url.trim()) {
      setError("Paste the link to your LinkedIn post first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await logLinkedInPost({ membershipId: membership.id, weekNumber, url: url.trim() });
      setUrl("");
      await loadAll();
    } catch (e: any) {
      setError(e.message ?? "Failed to log post");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-8 text-muted">Loading…</div>;
  if (!membership) return <div className="p-8 text-muted">No active cohort membership found.</div>;

  const currentWeek = computeWeekNumber(membership.cohort.startDate, new Date().toISOString());
  const loggedWeeks = new Set(posts.map((p) => p.weekNumber));
  const weeks = Array.from({ length: currentWeek }, (_, i) => i + 1);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">LinkedIn Posts</h1>
        <p className="text-muted text-sm mt-1">Log the LinkedIn post you shared each week of the program.</p>
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="font-medium text-foreground mb-3">Weekly log</h2>
        <div className="flex flex-wrap gap-2">
          {weeks.map((w) => {
            const logged = loggedWeeks.has(w);
            return (
              <button
                key={w}
                type="button"
                onClick={() => {
                  setWeekNumber(w);
                  urlInputRef.current?.focus();
                }}
                className={`w-9 h-9 rounded-full text-xs font-semibold flex items-center justify-center transition ${
                  logged
                    ? "bg-green-500 text-white"
                    : w === weekNumber
                    ? "border-2 border-primary text-primary"
                    : "border border-border text-muted hover:border-primary hover:text-primary"
                }`}
                title={logged ? `Week ${w} — logged` : `Week ${w} — not logged yet`}
              >
                {w}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted mt-2">Filled = logged. Click a week to log a post for it.</p>
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="font-medium text-foreground mb-3">Log a post</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Week</label>
              <input
                type="number"
                min={1}
                value={weekNumber}
                onChange={(e) => setWeekNumber(Number(e.target.value))}
                className="w-20 rounded-lg border border-border p-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-muted mb-1">LinkedIn post URL</label>
              <input
                ref={urlInputRef}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.linkedin.com/posts/..."
                className="w-full rounded-lg border border-border p-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium disabled:opacity-50 transition"
          >
            {submitting ? "Logging…" : "Log Post"}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="font-medium text-foreground mb-3">History</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-muted">No posts logged yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {posts.map((p) => (
              <li key={p.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0 text-xs font-semibold text-primary bg-accent-soft rounded-full px-2.5 py-1">
                    Week {p.weekNumber}
                  </span>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-foreground hover:text-primary truncate underline underline-offset-2"
                  >
                    {p.url}
                  </a>
                </div>
                <span className="shrink-0 text-xs text-muted">{new Date(p.loggedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}