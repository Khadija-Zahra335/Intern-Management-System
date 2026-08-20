"use client";

import { useState } from "react";

export function RoleTogglePreview() {
  const [role, setRole] = useState<"mentor" | "intern">("mentor");

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex justify-center mb-5">
        <div className="inline-flex items-center bg-white border border-border rounded-full p-1">
          <button
            onClick={() => setRole("mentor")}
            className={`text-sm font-semibold px-5 py-2 rounded-full transition-colors ${
              role === "mentor" ? "bg-primary text-white" : "text-muted"
            }`}
          >
            Mentor view
          </button>
          <button
            onClick={() => setRole("intern")}
            className={`text-sm font-semibold px-5 py-2 rounded-full transition-colors ${
              role === "intern" ? "bg-primary text-white" : "text-muted"
            }`}
          >
            Intern view
          </button>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl shadow-xl p-6">
        {role === "mentor" ? (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs text-muted">Fall 2026 Cohort</p>
                <p className="font-semibold text-foreground">Cohort Overview</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-accent-soft text-primary">6 interns</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="border border-border rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-foreground">82%</p>
                <p className="text-[11px] text-muted mt-0.5">Task Completion</p>
              </div>
              <div className="border border-border rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-foreground">4.3</p>
                <p className="text-[11px] text-muted mt-0.5">Avg. Rating</p>
              </div>
              <div className="border border-border rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-foreground">96%</p>
                <p className="text-[11px] text-muted mt-0.5">LinkedIn Cadence</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm border-b border-border pb-2">
                <span className="text-foreground">Ayesha K. — Week 6 submission</span>
                <span className="text-xs font-semibold text-primary">Needs review</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">Hamza R. — Week 6 check-in</span>
                <span className="text-xs font-semibold text-muted">Reviewed</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs text-muted">Week 6</p>
                <p className="font-semibold text-foreground">Your Tasks</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-accent-soft text-primary">2 open</span>
            </div>
            <div className="space-y-2 mb-5">
              <div className="flex items-center justify-between text-sm border border-border rounded-lg px-3 py-2.5">
                <span className="text-foreground">Build the mentor dashboard skeleton</span>
                <span className="text-xs font-semibold text-primary">In Progress</span>
              </div>
              <div className="flex items-center justify-between text-sm border border-border rounded-lg px-3 py-2.5">
                <span className="text-foreground">Post Week 6 LinkedIn update</span>
                <span className="text-xs font-semibold text-muted">Not Started</span>
              </div>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between text-sm">
              <span className="text-muted">Last mentor rating</span>
              <span className="font-semibold text-foreground">★★★★☆ (4/5)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}