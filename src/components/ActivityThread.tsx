"use client";

import { useEffect, useState } from "react";
import { Activity, getActivity, postActivity } from "@/lib/api";

export function ActivityThread({
  assignmentId,
  mineRole,
  headerTitle,
  headerSubtitle,
  emptyMessage = "Select someone to see their activity.",
}: {
  assignmentId: string | null;
  mineRole: "MENTOR" | "INTERN";
  headerTitle?: string;
  headerSubtitle?: string;
  emptyMessage?: string;
}) {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!assignmentId) {
      setActivity([]);
      return;
    }
    setLoading(true);
    getActivity(assignmentId)
      .then(setActivity)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load activity"))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  async function handlePost() {
    if (!assignmentId || !newMessage.trim()) return;
    setPosting(true);
    setError("");
    try {
      await postActivity(assignmentId, { content: newMessage.trim() });
      setNewMessage("");
      setActivity(await getActivity(assignmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="bg-white border border-border rounded-2xl flex flex-col overflow-hidden h-full">
      {(headerTitle || !assignmentId) && (
        <div className="px-5 py-4 border-b border-border shrink-0">
          <p className="text-sm font-bold text-foreground truncate">{headerTitle ?? "Activity"}</p>
          {headerSubtitle && <p className="text-xs text-muted mt-0.5">{headerSubtitle}</p>}
        </div>
      )}

      {!assignmentId ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-sm text-muted text-center">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {loading && <p className="text-muted text-sm">Loading activity...</p>}
            {!loading && activity.length === 0 && <p className="text-muted text-sm">No activity posted yet.</p>}
            {activity.map((entry) => {
              const mine = entry.author.role === mineRole;
              return (
                <div key={entry.id} className={`flex gap-2.5 max-w-[80%] ${mine ? "ml-auto flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${mine ? "bg-primary text-white" : "bg-accent-soft text-primary"}`}>
                    {entry.author.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={mine ? "text-right" : ""}>
                    <div className={`flex items-baseline gap-2 mb-1 ${mine ? "justify-end" : ""}`}>
                      <span className="text-xs font-semibold text-foreground">{mine ? "You" : entry.author.name}</span>
                      <span className="text-[11px] text-muted">{new Date(entry.createdAt).toLocaleString()}</span>
                    </div>
                    <div className={`rounded-2xl px-3.5 py-2 text-sm inline-block text-left ${mine ? "bg-primary text-white rounded-tr-sm" : "bg-accent-soft text-foreground rounded-tl-sm"}`}>
                      <p className="whitespace-pre-wrap">{entry.content}</p>
                      {entry.links.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {entry.links.map((link) => (
                            <li key={link}>
                              <a href={link} target="_blank" rel="noopener noreferrer" className={`underline text-sm ${mine ? "text-white" : "text-primary"}`}>{link}</a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 border-t border-border flex gap-2 items-center shrink-0">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={1}
              placeholder="Ask a question or leave a note..."
              className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <button
              onClick={handlePost}
              disabled={posting || !newMessage.trim()}
              className="bg-primary text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-primary-hover disabled:opacity-50 shrink-0"
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}