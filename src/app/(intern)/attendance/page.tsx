"use client";

import { useEffect, useState } from "react";
import { WorkHoursChart } from "@/components/WorkHoursChart";
import {
  deriveAttendanceState,
  computeDailyWorkHours,
  groupAttendanceByDay,
  ATTENDANCE_VALID_FROM,
  noteWordCount,
  LATE_CHECKIN_MIN_WORDS,
  LATE_CHECKIN_NOTE_MESSAGE,
} from "@/lib/attendanceHours";
import { pktDayKey } from "@/lib/timezone";
import { useLoadState } from "@/hooks/useLoadState";
import {
  getMyMemberships,
  getAttendance,
  logAttendance,
  Attendance,
  AttendanceType,
  MyMembership,
} from "@/lib/api";

type Tone = "primary" | "danger" | "amber" | "gray" | "blue";

const ALL_ACTIONS: { type: AttendanceType; label: string; tone: Tone }[] = [
  { type: "CHECK_IN", label: "Check In", tone: "primary" },
  { type: "CHECK_OUT", label: "Check Out", tone: "danger" },
  { type: "LUNCH_START", label: "Start Lunch", tone: "amber" },
  { type: "LUNCH_END", label: "End Lunch", tone: "amber" },
  { type: "AFK_START", label: "Go AFK", tone: "gray" },
  { type: "AFK_END", label: "Back from AFK", tone: "gray" },
  { type: "RELAX_START", label: "Start Break", tone: "blue" },
  { type: "RELAX_END", label: "End Break", tone: "blue" },
];

const STATE_LABEL: Record<string, string> = {
  OUT: "Not checked in",
  IN: "Checked In",
  LUNCH: "On lunch",
  AFK: "AFK",
  RELAX: "On a break",
};

const STATE_DOT: Record<string, string> = {
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

const ACTION_BOX_TONE: Record<Tone, string> = {
  primary: "text-primary hover:border-primary",
  danger: "text-red-600 hover:border-red-300",
  amber: "text-amber-600 hover:border-amber-300",
  gray: "text-foreground hover:border-primary",
  blue: "text-blue-600 hover:border-blue-300",
};

function ForkKnifeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M5 2v6a1.5 1.5 0 003 0V2M6.5 8v10M15 2c-1.5 0-2.5 2-2.5 4.5S13.5 11 15 11v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CoffeeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M4 8h10v4a4 4 0 01-4 4H8a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 9h1a2 2 0 010 4h-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.5 3.5c0 1-1 1-1 2M9.5 3.5c0 1-1 1-1 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function WalkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="11" cy="3.5" r="1.6" fill="currentColor" />
      <path d="M9 6l-2 3 2 1.5-1 5M9 6l3 1 2-1M12 10l2 1.5-1 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M8 3H4.5A1.5 1.5 0 003 4.5v11A1.5 1.5 0 004.5 17H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 13.5L16 10l-4-3.5M16 10H7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M12 3h3.5A1.5 1.5 0 0117 4.5v11a1.5 1.5 0 01-1.5 1.5H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 6.5L4 10l4 3.5M4 10h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M7.5 4.5l5 5.5-5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ACTION_ICONS: Record<AttendanceType, (props: { className?: string }) => React.JSX.Element> = {
  CHECK_IN: LogInIcon,
  CHECK_OUT: LogOutIcon,
  LUNCH_START: ForkKnifeIcon,
  LUNCH_END: ForkKnifeIcon,
  AFK_START: WalkIcon,
  AFK_END: WalkIcon,
  RELAX_START: CoffeeIcon,
  RELAX_END: CoffeeIcon,
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatHours(h: number) {
  if (h <= 0) return "—";
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

export default function AttendancePage() {
  const [membership, setMembership] = useState<MyMembership | null>(null);
  const [records, setRecords] = useState<Attendance[]>([]);
  const { loading, refreshing, startLoad, endLoad } = useLoadState();
  const [error, setError] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<AttendanceType | null>(null);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [checkoutNote, setCheckoutNote] = useState("");
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [checkinNote, setCheckinNote] = useState("");
  const [checkinNoteError, setCheckinNoteError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  async function loadAll(initial = false) {
    startLoad(initial);
    setError(null);
    try {
      const memberships = await getMyMemberships();
      const active = memberships.find((m) => m.isActive) ?? null;
      setMembership(active);
      if (active) {
        const data = await getAttendance(active.id);
        setRecords(data);
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to load attendance");
    } finally {
      endLoad(initial);
    }
  }

  useEffect(() => {
    loadAll(true);
  }, []);

  async function handleAction(type: AttendanceType, note?: string) {
    if (!membership) return;
    setPendingType(type);
    setError(null);
    try {
      await logAttendance({ membershipId: membership.id, type, note });
      setShowCheckoutForm(false);
      setCheckoutNote("");
      setShowCheckinForm(false);
      setCheckinNote("");
      setCheckinNoteError(null);
      await loadAll();
    } catch (e: any) {
      const message = e.message ?? "Failed to log attendance";
      // A plain check-in attempt (no note) gets rejected because it's past
      // the late-checkin cutoff — reveal the note form instead of just
      // showing this as a generic error, so the intern can retry with a
      // reason in one extra step rather than guessing what went wrong.
      if (type === "CHECK_IN" && message === LATE_CHECKIN_NOTE_MESSAGE) {
        setShowCheckinForm(true);
      } else {
        setError(message);
      }
    } finally {
      setPendingType(null);
    }
  }

  function submitCheckin() {
    if (noteWordCount(checkinNote) < LATE_CHECKIN_MIN_WORDS) {
      setCheckinNoteError(`Please describe your reason in at least ${LATE_CHECKIN_MIN_WORDS} words.`);
      return;
    }
    setCheckinNoteError(null);
    handleAction("CHECK_IN", checkinNote);
  }

  if (loading) return <div className="p-8 text-muted">Loading attendance…</div>;
  if (!membership) return <div className="p-8 text-muted">No active cohort membership found.</div>;

  const { state } = deriveAttendanceState(records);

  const grouped = groupAttendanceByDay(records);
  const dailyHours = computeDailyWorkHours(records);
 const todayKey = pktDayKey(new Date());
  const todayRecords = (grouped.get(todayKey) ?? []).slice().reverse();
  const pastDayKeys = Array.from(grouped.keys())
    .filter((k) => k !== todayKey)
    .sort((a, b) => b.localeCompare(a));
  const visibleDayKeys = showAllHistory ? pastDayKeys : pastDayKeys.slice(0, 5);

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
        <p className="text-sm text-muted">Log your check-ins and breaks for the day.</p>
        {refreshing && <p className="text-xs text-muted mt-1">Syncing…</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        <div className="space-y-5">
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-foreground">Current Status</h2>
              <span className="inline-flex items-center gap-2 text-sm font-semibold px-3.5 py-2 rounded-full bg-gray-100 text-foreground">
                <span className={`w-2 h-2 rounded-full ${STATE_DOT[state]}`} />
                {STATE_LABEL[state]}
              </span>
            </div>
            <p className="text-sm text-primary mb-5">{todayLabel}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ALL_ACTIONS.map((a) => {
                const Icon = ACTION_ICONS[a.type];
               const isValid = state === ATTENDANCE_VALID_FROM[a.type];
                const disabled = pendingType !== null || !isValid;
                return (
                  <button
                    key={a.type}
                    disabled={disabled}
                    onClick={() => (a.type === "CHECK_OUT" ? setShowCheckoutForm(true) : handleAction(a.type))}
                    className={`flex flex-col items-center justify-center gap-2 h-24 rounded-xl border transition-colors ${
                      disabled
                        ? "border-border bg-gray-50 text-gray-300 cursor-not-allowed"
                        : `border-border bg-white ${ACTION_BOX_TONE[a.tone]} hover:shadow-sm hover:-translate-y-0.5`
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-semibold text-center px-1">
                      {pendingType === a.type ? "…" : a.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {showCheckoutForm && (
              <div className="mt-5 border-t border-border pt-5">
                <label className="block text-sm text-muted mb-2">
                  Note (required if checking out after 8 PM PKT — a short reason is fine)
                </label>
                <textarea
                  value={checkoutNote}
                  onChange={(e) => setCheckoutNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border p-3 text-sm"
                  placeholder="e.g. Wrapped up the API integration task, syncing with team tomorrow"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAction("CHECK_OUT", checkoutNote || undefined)}
                    disabled={pendingType !== null}
                    className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 transition"
                  >
                    {pendingType === "CHECK_OUT" ? "Checking out…" : "Confirm Check Out"}
                  </button>
                  <button
                    onClick={() => setShowCheckoutForm(false)}
                    className="px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showCheckinForm && (
              <div className="mt-5 border-t border-border pt-5">
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-3">
                  {LATE_CHECKIN_NOTE_MESSAGE}
                </p>
                <label className="block text-sm text-muted mb-2">
                  Reason (min. {LATE_CHECKIN_MIN_WORDS} words)
                </label>
                <textarea
                  value={checkinNote}
                  onChange={(e) => {
                    setCheckinNote(e.target.value);
                    if (checkinNoteError) setCheckinNoteError(null);
                  }}
                  rows={2}
                  className="w-full rounded-lg border border-border p-3 text-sm"
                  placeholder="e.g. Traffic was bad this morning, sorry for the delay"
                />
                {checkinNoteError && (
                  <p className="mt-1.5 text-xs text-red-600">{checkinNoteError}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={submitCheckin}
                    disabled={pendingType !== null}
                    className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold disabled:opacity-50 transition"
                  >
                    {pendingType === "CHECK_IN" ? "Checking in…" : "Confirm Check In"}
                  </button>
                  <button
                    onClick={() => {
                      setShowCheckinForm(false);
                      setCheckinNote("");
                      setCheckinNoteError(null);
                    }}
                    className="px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-white border border-border rounded-2xl p-6">
              <h2 className="text-base font-bold text-foreground mb-4">Today&apos;s Log</h2>
              {todayRecords.length === 0 ? (
                <p className="text-sm text-muted">No activity logged today yet.</p>
              ) : (
                <ol className="relative border-l border-border pl-4 space-y-4">
                  {todayRecords.map((r) => (
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

            <div className="bg-white border border-border rounded-2xl p-6">
              <h2 className="text-base font-bold text-foreground mb-4">Past History</h2>
              {pastDayKeys.length === 0 ? (
                <p className="text-sm text-muted">No earlier records yet.</p>
              ) : (
                <div className="space-y-2">
                  {visibleDayKeys.map((key) => {
                    const dayRecords = grouped.get(key)!;
                    const hours = dailyHours.get(key) ?? 0;
                    const label = new Date(`${key}T00:00:00`).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
                    const isExpanded = expandedDay === key;
                    return (
                      <div key={key} className="border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedDay(isExpanded ? null : key)}
                          className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-accent-soft/40 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <ChevronRightIcon className={`w-4 h-4 text-muted transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                            {label}
                          </span>
                          <span className="text-sm text-muted">{formatHours(hours)}</span>
                        </button>
                        {isExpanded && (
                          <ul className="divide-y divide-border border-t border-border">
                            {dayRecords.slice().reverse().map((r) => (
                              <li key={r.id} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                                <span className="text-foreground">{TYPE_LABEL[r.type]}</span>
                                <span className="text-muted">{formatTime(r.occurredAt)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                  {pastDayKeys.length > 5 && (
                    <button
                      onClick={() => setShowAllHistory((s) => !s)}
                      className="text-sm font-semibold text-primary hover:underline pt-1"
                    >
                      {showAllHistory ? "Show less" : "View Full History"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6">
          <WorkHoursChart attendance={records} />
        </div>
      </div>
    </div>
  );
}