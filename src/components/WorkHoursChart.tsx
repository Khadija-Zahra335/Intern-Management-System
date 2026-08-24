"use client";

import { useMemo, useState } from "react";
import { Attendance } from "@/lib/api";
import { computeDailyWorkHours, weekBars, monthBars, yearBars, type HourBar } from "@/lib/attendanceHours";

type Range = "week" | "month" | "year";

const RANGE_LABEL: Record<Range, string> = { week: "This Week", month: "This Month", year: "This Year" };

function barClasses(bar: HourBar): { track: string; fill: string } {
  if (!bar.hasData) return { track: "", fill: "" };
  const ratio = bar.goalHours > 0 ? bar.hours / bar.goalHours : 0;
  if (ratio >= 1) return { track: "bg-green-50", fill: "bg-green-500" };
  if (ratio >= 0.9) return { track: "bg-amber-50", fill: "bg-amber-500" };
  return { track: "bg-red-50", fill: "bg-red-400" };
}

export function WorkHoursChart({ attendance }: { attendance: Attendance[] }) {
  const [range, setRange] = useState<Range>("week");
  const now = useMemo(() => new Date(), []);
  const daily = useMemo(() => computeDailyWorkHours(attendance), [attendance]);

  const bars = useMemo(() => {
    if (range === "week") return weekBars(daily, now);
    if (range === "month") return monthBars(daily, now);
    return yearBars(daily, now);
  }, [range, daily, now]);

  const maxHours = Math.max(8, ...bars.map((b) => b.hours), ...bars.map((b) => b.goalHours));
  const scrollable = range === "month" && bars.length > 10;

  return (
    <div className="bg-white border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="text-sm font-bold text-foreground">Work Hours</div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-accent-soft/60 p-1 rounded-lg">
            {(["week", "month", "year"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  range === r ? "bg-white text-primary shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                {r === "week" ? "Week" : r === "month" ? "Month" : "Year"}
              </button>
            ))}
          </div>
          <span className="text-xs font-semibold text-primary bg-accent-soft rounded-full px-2.5 py-1">{RANGE_LABEL[range]}</span>
        </div>
      </div>

      <div className={scrollable ? "overflow-x-auto" : ""}>
        <div className="relative h-[100px]" style={{ minWidth: scrollable ? `${bars.length * 28}px` : undefined }}>
          <div className="absolute left-0 right-0 border-t border-dashed border-border" style={{ top: 16 }} />
          <div className="flex items-end justify-between h-full gap-1.5">
            {bars.map((bar) => {
              const colors = barClasses(bar);
              const pct = bar.hasData ? Math.min(100, (bar.hours / maxHours) * 100) : 0;
              const trackClass = !bar.hasData
                ? "border border-dashed border-border"
                : bar.isCurrent
                ? "ring-2 ring-accent ring-inset"
                : colors.track;
              return (
                <div key={bar.key} className="flex-1 flex flex-col items-center gap-1.5 min-w-[14px]">
                  <div className="text-[10px] font-semibold text-foreground">{bar.hasData ? `${bar.hours.toFixed(1)}h` : "—"}</div>
                  <div className={`w-full rounded-t-lg flex items-end h-[70px] ${trackClass}`}>
                    {bar.hasData && <div className={`w-full rounded-t-lg ${colors.fill}`} style={{ height: `${pct}%` }} />}
                  </div>
                  <div className={`text-[10px] font-semibold ${bar.isCurrent ? "text-primary" : "text-muted"}`}>{bar.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/60 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px] text-muted"><span className="w-2 h-2 rounded-sm bg-green-500" />Goal met</div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted"><span className="w-2 h-2 rounded-sm bg-amber-500" />Close</div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted"><span className="w-2 h-2 rounded-sm bg-red-400" />Under</div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted"><span className="w-2 h-2 rounded-sm ring-2 ring-accent ring-inset" />{range === "year" ? "Current month" : "Today"}</div>
      </div>
    </div>
  );
}