"use client";

import { useEffect, useRef, useState } from "react";
import { getToken } from "@/lib/api";
import { MarkdownText } from "@/components/MarkdownText";

interface Source {
  intern: string;
  week: number;
  type: string;
  score: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  error?: boolean;
}

const SUGGESTIONS = [
  { title: "Who's blocked or falling behind?", subtitle: "Check task status across all interns" },
  { title: "Summarize this week's feedback", subtitle: "Roll up ratings and comments" },
  { title: "Any concerning check-in notes?", subtitle: "Surface late check-outs and break notes" },
  { title: "What needs my attention this week?", subtitle: "A quick overall read" },
];

export function AssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || streaming) return;

    const history = [...messages, { role: "user" as const, content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const token = getToken();
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong. Please try again.");
      }

      const sourcesHeader = res.headers.get("X-RAG-Sources");
      const sources: Source[] = sourcesHeader ? JSON.parse(decodeURIComponent(sourcesHeader)) : [];

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              answer += delta;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: answer };
                return next;
              });
            }
          } catch {
            // A split/partial chunk — skip it, the next read usually completes it.
          }
        }
      }

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: answer, sources };
        return next;
      });
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: err instanceof Error ? err.message : "Something went wrong. Please try again.",
          error: true,
        };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  if (collapsed) {
    return (
      <div className="w-14 shrink-0 bg-dark-border border border-dark-bg rounded-2xl flex flex-col items-center py-4 h-[calc(100vh-8rem)] sticky top-8">        <button
          onClick={() => setCollapsed(false)}
          className="w-9 h-9 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label="Expand AI Assistant"
        >
          <ChatBubbleIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 shrink-0 bg-white border border-border rounded-2xl flex flex-col h-[calc(100vh-8rem)] sticky top-8 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 bg-dark-border border-b border-dark-border">
        <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0">
          <ChatBubbleIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-white leading-tight">AI Assistant</h2>
          <span className="text-[10px] font-bold uppercase tracking-wide text-dark-muted">BETA</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="ml-auto w-7 h-7 rounded-lg text-dark-muted hover:bg-white/10 hover:text-white flex items-center justify-center shrink-0 transition-colors"
          aria-label="Collapse AI Assistant"
        >
          <ChevronIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="bg-accent-soft rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-foreground">
            👋 Hi Mentor! How can I help you today?
          </div>
        )}

        {messages.length === 0 &&
          SUGGESTIONS.map((s) => (
            <button
              key={s.title}
              onClick={() => send(s.title)}
              className="w-full text-left border border-border rounded-xl px-3.5 py-2.5 hover:border-primary hover:bg-accent-soft/60 transition-colors"
            >
              <p className="text-sm font-medium text-primary">{s.title}</p>
              <p className="text-xs text-muted mt-0.5">{s.subtitle}</p>
            </button>
          ))}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] bg-primary text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm"
                  : `max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm ${
                      m.error ? "bg-red-50 text-red-600" : "bg-accent-soft text-foreground"
                    }`
              }
            >
                           {m.content ? (
                m.role === "assistant" ? (
                  <MarkdownText content={m.content} />
                ) : (
                  m.content
                )
              ) : streaming && i === messages.length - 1 ? (
                "…"
              ) : (
                ""
              )}
              {m.sources && m.sources.length > 0 && (
                <p className="text-[11px] text-muted mt-2 pt-2 border-t border-border/60">
                  Sourced from: {m.sources.map((s) => `${s.intern} (Week ${s.week})`).join(", ")}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            disabled={streaming}
            className="flex-1 min-w-0 text-sm border border-border rounded-full px-4 py-2 focus:outline-none focus:border-primary disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="w-9 h-9 rounded-full bg-dark-border hover:bg-dark-border disabled:bg-border text-white flex items-center justify-center shrink-0 transition-colors"
          >
            <SendIcon className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[11px] text-muted mt-2 text-center">AI responses may be inaccurate.</p>
      </div>
    </div>
  );
}

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v6A2.5 2.5 0 0 1 14.5 14H8l-3.5 3v-3H5.5A2.5 2.5 0 0 1 3 11.5v-6z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M17 3L3 9.5l6 2.5 2 6L17 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" />
    </svg>
  );
}