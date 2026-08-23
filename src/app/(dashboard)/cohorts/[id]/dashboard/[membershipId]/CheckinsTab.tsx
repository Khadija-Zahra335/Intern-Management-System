"use client";

import { Attendance } from "@/lib/api";
import { WorkHoursChart } from "@/components/WorkHoursChart";
import { deriveAttendanceState, groupAttendanceByDay, type SessionState } from "@/lib/attendanceHours";
import { useState } from "react";

const STATE_META: Record<SessionState, { label: string; dot: string; bg: string; text: string }> = {
  OUT: { label: "Checked Out", dot: "bg-gray-400", bg: "bg-gray-100", text: "text-gray-600" },
  IN: { label: "Checked In", dot: "bg-green-500", bg: "bg-green-50", text: "text-green-700" },
  LUNCH: { label: "On Lunch", dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  AFK: { label: "AFK", dot: "bg-gray-500", bg: "bg-gray-100", text: "text-gray-600" },
  RELAX: { label: "On a Break", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
};

const EVENT_LABEL: Record<string, string> = {
  CHECK_IN: "Checked In", CHECK_OUT: "Checked Out",
  LUNCH_START: "Lunch Started", LUNCH_END: "Lunch Ended",
  AFK_START: "Went AFK", AFK_END: "Back from AFK",
  RELAX_START: "Break Started", RELAX_END: "Break Ended",
};

const EVENT_DOT: Record<string, string> = {
  CHECK_IN: "bg-primary", CHECK_OUT: "bg-gray-400",
  LUNCH_START: "bg-amber-500", LUNCH_END: "bg-amber-300",
  AFK_START: "bg-gray-500", AFK_END: "bg-gray-300",
  RELAX_START: "bg-blue-500", RELAX_END: "bg-blue-300",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function CheckinsTab({ attendance }: { attendance: Attendance[] }) {
  const [showAllHistory, setShowAllHistory] = useState(false);

  const { state, lastEvent } = deriveAttendanceState(attendance);
  const stateMeta = STATE_META[state];
  const byDay = groupAttendanceByDay(attendance);
  const todayKey = new Date().toLocaleDateString("en-CA");
  const todayRecords = byDay.get(todayKey) ?? [];
  const pastDays = Array.from(byDay.entries()).filter(([key]) => key !== todayKey).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const visiblePastDays = showAllHistory ? pastDays : pastDays.slice(0, 3);

  return (
    <div>
      <div className="bg-white border border-border rounded-2xl p-5 mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Current Activity</p>
          <p className="text-sm text-muted">
            {lastEvent ? `${EVENT_LABEL[lastEvent.type] ?? lastEvent.type} at ${formatTime(lastEvent.occurredAt)}` : "No activity logged yet"}
          </p>
        </div>
        <span className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full ${stateMeta.bg} ${stateMeta.text}`}>
          <span className={`w-2 h-2 rounded-full ${stateMeta.dot}`} />
          {stateMeta.label}
        </span>
      </div>

      <div className="mb-4">
        <WorkHoursChart attendance={attendance} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-border rounded-2xl p-5 sm:col-span-1">
          <h2 className="text-sm font-bold text-foreground mb-4">Today's Log</h2>
          {todayRecords.length === 0 ? (
            <p className="text-sm text-muted">No activity logged today yet.</p>
          ) : (
            <div className="relative pl-4">
              <div className="absolute left-[3px] top-1 bottom-1 w-px bg-border" />
              {todayRecords.map((r, i) => (
                <div key={r.id} className={i < todayRecords.length - 1 ? "relative pb-4" : "relative"}>
                  <span className={`absolute -left-4 top-1 w-2 h-2 rounded-full ${EVENT_DOT[r.type] ?? "bg-gray-400"}`} />
                  <p className="text-sm font-medium text-foreground">{EVENT_LABEL[r.type] ?? r.type}</p>
                  <p className="text-xs text-muted">{formatTime(r.occurredAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-border rounded-2xl p-5 sm:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-foreground">Past History</h2>
            {pastDays.length > 3 && (
              <button onClick={() => setShowAllHistory((v) => !v)} className="text-xs font-semibold text-primary hover:underline">
                {showAllHistory ? "Show less" : "View Full History →"}
              </button>
            )}
          </div>
          {pastDays.length === 0 ? (
            <p className="text-sm text-muted">No earlier records yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {visiblePastDays.map(([key, records]) => {
                const checkIn = records.find((r) => r.type === "CHECK_IN");
                const checkOut = [...records].reverse().find((r) => r.type === "CHECK_OUT");
                return (
                  <div key={key} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="font-medium text-foreground">
                      {new Date(key).toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })}
                    </span>
                    <span className="text-muted">{checkIn ? formatTime(checkIn.occurredAt) : "—"} – {checkOut ? formatTime(checkOut.occurredAt) : "—"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}