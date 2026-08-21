"use client";

import { useEffect, useState } from "react";
import {
  getMyMemberships,
  getAttendance,
  logAttendance,
  Attendance,
  AttendanceType,
  MyMembership,
} from "@/lib/api";

type SessionState = "OUT" | "IN" | "LUNCH" | "AFK" | "RELAX";

function deriveState(records: Attendance[]): SessionState {
  if (records.length === 0) return "OUT";
  const latest = records[0].type; // GET returns newest first
  switch (latest) {
    case "CHECK_OUT":
      return "OUT";
    case "CHECK_IN":
    case "LUNCH_END":
    case "AFK_END":
    case "RELAX_END":
      return "IN";
    case "LUNCH_START":
      return "LUNCH";
    case "AFK_START":
      return "AFK";
    case "RELAX_START":
      return "RELAX";
    default:
      return "OUT";
  }
}

type Tone = "primary" | "danger" | "amber" | "gray" | "blue";

const TONE_CLASSES: Record<Tone, string> = {
  primary: "bg-primary hover:bg-primary-hover text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  amber: "bg-amber-500 hover:bg-amber-600 text-white",
  gray: "bg-gray-500 hover:bg-gray-600 text-white",
  blue: "bg-blue-500 hover:bg-blue-600 text-white",
};

const ACTIONS_BY_STATE: Record<SessionState, { type: AttendanceType; label: string; tone: Tone }[]> = {
  OUT: [{ type: "CHECK_IN", label: "Check In", tone: "primary" }],
  IN: [
    { type: "CHECK_OUT", label: "Check Out", tone: "danger" },
    { type: "LUNCH_START", label: "Start Lunch", tone: "amber" },
    { type: "AFK_START", label: "Go AFK", tone: "gray" },
    { type: "RELAX_START", label: "Take a Break", tone: "blue" },
  ],
  LUNCH: [{ type: "LUNCH_END", label: "End Lunch", tone: "amber" }],
  AFK: [{ type: "AFK_END", label: "Back from AFK", tone: "gray" }],
  RELAX: [{ type: "RELAX_END", label: "End Break", tone: "blue" }],
};

const STATE_LABEL: Record<SessionState, string> = {
  OUT: "Not checked in",
  IN: "Checked in",
  LUNCH: "On lunch",
  AFK: "AFK",
  RELAX: "On a break",
};

const STATE_DOT: Record<SessionState, string> = {
  OUT: "bg-gray-400",
  IN: "bg-green-500",
  LUNCH: "bg-amber-500",
  AFK: "bg-gray-500",
  RELAX: "bg-blue-500",
};

const TYPE_LABEL: Record<AttendanceType, string> = {
  CHECK_IN: "Checked In",
  CHECK_OUT: "Checked Out",
  LUNCH_START: "Lunch Started",
  LUNCH_END: "Lunch Ended",
  AFK_START: "Went AFK",
  AFK_END: "Back from AFK",
  RELAX_START: "Break Started",
  RELAX_END: "Break Ended",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default function AttendancePage() {
  const [membership, setMembership] = useState<MyMembership | null>(null);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<AttendanceType | null>(null);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [checkoutNote, setCheckoutNote] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const memberships = await getMyMemberships();
      const active = memberships.find((m) => m.isActive) ?? memberships[0] ?? null;
      setMembership(active);
      if (active) {
        const data = await getAttendance(active.id);
        setRecords(data);
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleAction(type: AttendanceType, note?: string) {
    if (!membership) return;
    setPendingType(type);
    setError(null);
    try {
      await logAttendance({ membershipId: membership.id, type, note });
      setShowCheckoutForm(false);
      setCheckoutNote("");
      await loadAll();
    } catch (e: any) {
      setError(e.message ?? "Failed to log attendance");
    } finally {
      setPendingType(null);
    }
  }

  if (loading) return <div className="p-8 text-muted">Loading attendance…</div>;
  if (!membership) return <div className="p-8 text-muted">No active cohort membership found.</div>;

  const state = deriveState(records);
  const actions = ACTIONS_BY_STATE[state];
  const today = new Date();
  const todayRecords = records.filter((r) => isSameDay(new Date(r.occurredAt), today));
  const pastRecords = records.filter((r) => !isSameDay(new Date(r.occurredAt), today));

  const byDay = new Map<string, Attendance[]>();
  for (const r of pastRecords) {
    const key = new Date(r.occurredAt).toLocaleDateString();
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(r);
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Attendance</h1>
        <p className="text-muted text-sm mt-1">Log your check-ins and breaks for the day.</p>
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className={`h-2.5 w-2.5 rounded-full ${STATE_DOT[state]}`} />
          <span className="font-medium text-foreground">{STATE_LABEL[state]}</span>
        </div>

        <div className="flex flex-wrap gap-3">
          {actions.map((a) => (
            <button
              key={a.type}
              disabled={pendingType !== null}
              onClick={() => (a.type === "CHECK_OUT" ? setShowCheckoutForm(true) : handleAction(a.type))}
              className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition ${TONE_CLASSES[a.tone]}`}
            >
              {pendingType === a.type ? "Logging…" : a.label}
            </button>
          ))}
        </div>

        {showCheckoutForm && (
          <div className="mt-4 border-t border-border pt-4">
            <label className="block text-sm text-muted mb-2">
              Note (required if checking out after 8 PM PKT — a short reason is fine)
            </label>
            <textarea
              value={checkoutNote}
              onChange={(e) => setCheckoutNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border p-2 text-sm"
              placeholder="e.g. Wrapped up the API integration task, syncing with team tomorrow"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleAction("CHECK_OUT", checkoutNote || undefined)}
                disabled={pendingType !== null}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition"
              >
                {pendingType === "CHECK_OUT" ? "Checking out…" : "Confirm Check Out"}
              </button>
              <button
                onClick={() => setShowCheckoutForm(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="font-medium text-foreground mb-3">Today</h2>
        {todayRecords.length === 0 ? (
          <p className="text-sm text-muted">No activity logged today yet.</p>
        ) : (
          <ol className="relative border-l border-border pl-4 space-y-3">
            {[...todayRecords].reverse().map((r) => (
              <li key={r.id} className="text-sm relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-accent" />
                <span className="font-medium text-foreground">{TYPE_LABEL[r.type]}</span>{" "}
                <span className="text-muted">at {formatTime(r.occurredAt)}</span>
                {r.note && <p className="text-muted mt-0.5">{r.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="font-medium text-foreground">Past history</h2>
          <span className={`text-muted transition-transform ${showHistory ? "rotate-180" : ""}`}>▾</span>
        </button>

        {showHistory && (
          <div className="mt-4 space-y-4">
            {byDay.size === 0 ? (
              <p className="text-sm text-muted">No earlier records yet.</p>
            ) : (
              Array.from(byDay.entries()).map(([day, dayRecords]) => (
                <div key={day}>
                  <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">{day}</p>
                  <ul className="divide-y divide-border">
                    {dayRecords.map((r) => (
                      <li key={r.id} className="py-2 flex items-center justify-between text-sm">
                        <span className="text-foreground">{TYPE_LABEL[r.type]}</span>
                        <span className="text-muted">{formatTime(r.occurredAt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}