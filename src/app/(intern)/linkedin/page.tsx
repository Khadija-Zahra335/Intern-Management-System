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
import { formatDate } from "@/lib/format";
import { useLoadState } from "@/hooks/useLoadState";

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.25 2.36 4.25 5.44v6.3zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-none stroke-current inline shrink-0" strokeWidth={1.5}>
      <path d="M8 12l4-4m-5 5l-1.5 1.5a3 3 0 01-4.2-4.2L3 8.8m9-3.6L13.5 3.7a3 3 0 014.2 4.2L16 9.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 fill-none stroke-current shrink-0" strokeWidth={2}>
      <path d="M10 4v12M4 10h12" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 fill-none stroke-current shrink-0" strokeWidth={2.5}>
      <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const GUIDELINES = [
  "Post every week before Friday",
  "Tag the company in your post",
  "Use #internship and a technical hashtag",
];

export default function LinkedInPage() {
  const [membership, setMembership] = useState<MyMembership | null>(null);
  const [posts, setPosts] = useState<LinkedInPost[]>([]);
  const { loading, refreshing, startLoad, endLoad } = useLoadState();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [weekNumber, setWeekNumber] = useState(1);
  const [url, setUrl] = useState("");
  const urlInputRef = useRef<HTMLInputElement>(null);

  async function loadAll(initial = false) {
    startLoad(initial);
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
      endLoad(initial);
    }
  }

  useEffect(() => {
    loadAll(true);
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
  const totalWeeks = Math.max(
    currentWeek,
    computeWeekNumber(membership.cohort.startDate, membership.cohort.endDate)
  );
  const loggedWeeks = new Set(posts.map((p) => p.weekNumber));
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);
  const completedCount = weeks.filter((w) => loggedWeeks.has(w)).length;

  const sortedPosts = [...posts].sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-[#0A66C2] flex items-center justify-center shrink-0">
            <LinkedInIcon />
          </span>
          <h1 className="text-xl font-bold text-foreground">Weekly Social Posts</h1>
        </div>
        <p className="text-sm font-medium text-primary mt-1 ml-8">
          {completedCount} / {totalWeeks} weeks posted
        </p>
        {refreshing && <p className="text-xs text-muted mt-1 ml-8">Syncing…</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <h2 className="font-semibold text-foreground">Weekly posting grid</h2>
              <p className="text-sm text-muted mt-0.5">
                {completedCount} of {totalWeeks} weeks completed
              </p>
            </div>
            <div className="border-t border-border px-6 py-6">
              <div className="grid grid-cols-6 gap-x-4 gap-y-6">
                {weeks.map((w) => {
                  const logged = loggedWeeks.has(w);
                  const disabled = w > currentWeek;
                  return (
                    <button
                      key={w}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setWeekNumber(w);
                        urlInputRef.current?.focus();
                      }}
                      title={
                        disabled
                          ? `Week ${w} — not started yet`
                          : logged
                          ? `Week ${w} — logged`
                          : `Week ${w} — not logged yet`
                      }
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <span
                        className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-semibold transition ${
                          logged
                            ? "bg-primary text-white"
                            : disabled
                            ? "border border-border text-muted/40 cursor-not-allowed"
                            : w === weekNumber
                            ? "border-2 border-primary text-primary"
                            : "border border-border text-muted group-hover:border-primary group-hover:text-primary"
                        }`}
                      >
                        {logged ? <CheckIcon /> : w}
                      </span>
                      <span className="text-[11px] font-medium text-muted">W{w}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <h2 className="font-semibold text-foreground">Posted history</h2>
              <p className="text-sm text-muted mt-0.5">
                {sortedPosts.length} post{sortedPosts.length === 1 ? "" : "s"}
              </p>
            </div>
            {sortedPosts.length === 0 ? (
              <p className="text-sm text-muted px-6 pb-6">No posts logged yet.</p>
            ) : (
              <div className="overflow-x-auto border-t border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-muted uppercase tracking-wide bg-accent-soft/30">
                      <th className="px-6 py-3">Week</th>
                      <th className="px-6 py-3">Post URL</th>
                      <th className="px-6 py-3">Date logged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedPosts.map((p) => (
                      <tr key={p.id} className="hover:bg-accent-soft/40 transition-colors">
                        <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">
                          Week {p.weekNumber}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                        <a  
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary hover:text-primary-hover truncate"
                          >
                            <LinkIcon />
                            <span className="truncate">{p.url}</span>
                          </a>
                        </td>
                        <td className="px-6 py-4 text-muted whitespace-nowrap">{formatDate(p.loggedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <h2 className="font-semibold text-foreground px-6 pt-6 pb-4 border-b border-border">Log a new post</h2>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Week number <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={currentWeek}
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(Number(e.target.value))}
                  placeholder="e.g. 7"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Post URL <span className="text-red-500">*</span>
                </label>
                <input
                  ref={urlInputRef}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://linkedin.com/posts/..."
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium disabled:opacity-50 transition"
              >
                <PlusIcon />
                {submitting ? "Logging…" : "Log Post"}
              </button>
            </form>

            {error && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="mt-5 bg-accent-soft/60 rounded-xl p-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Guidelines</p>
              <ul className="space-y-1.5">
                {GUIDELINES.map((g) => (
                  <li key={g} className="text-sm text-foreground">
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}