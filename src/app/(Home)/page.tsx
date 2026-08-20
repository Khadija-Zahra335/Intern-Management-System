import Link from "next/link";
import { RoleTogglePreview } from "./RoleTogglePreview";

export function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="font-extrabold text-lg tracking-tight text-foreground">Musketeer Tech</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted">
            <a href="#workflow" className="hover:text-foreground">Workflow</a>
          </div>
          <Link href="/login" className="rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-medium px-5 py-2.5 transition-colors">
            Sign In
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse 60% 50% at 50% 0%, black 30%, transparent 80%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-6 pt-20 pb-10 text-center">
          <div className="inline-flex items-center gap-1.5 mb-6 px-3 py-1 rounded-full text-xs font-semibold bg-accent-soft text-primary">
            INTERNAL TOOL · MUSKETEER TECH
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.15] mb-5 text-foreground">
            One system for how every{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span className="relative z-10">internship cohort</span>
              <span className="absolute left-[-2px] right-[-2px] bottom-1 h-3 bg-accent-soft rounded-sm -z-0" />
            </span>{" "}
            actually runs.
          </h1>
          <p className="text-muted text-base mb-9 max-w-lg mx-auto">
            Weekly tasks, progress check-ins, mentor feedback, and LinkedIn cadence —
            tracked the same way, every week, for every cohort.
          </p>
          <div className="flex items-center justify-center gap-3 mb-10">
            <Link href="/login" className="rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-6 py-3 transition-colors">
              Sign In
            </Link>
            <a href="#workflow" className="rounded-full bg-white border border-border text-foreground text-sm font-semibold px-6 py-3 hover:border-primary transition-colors">
              See the Workflow ↓
            </a>
          </div>
        </div>

        <div className="relative max-w-3xl mx-auto px-6 pb-20">
          <RoleTogglePreview />
        </div>
      </section>

      <section id="workflow" className="max-w-6xl mx-auto px-6 pb-20">
        <p className="text-center text-xs font-semibold text-primary mb-2 tracking-wide">THE WEEKLY CYCLE</p>
        <h2 className="text-2xl font-bold text-center mb-12 text-foreground">The same loop, every week, for every cohort</h2>
        <div className="grid md:grid-cols-4 gap-6 relative">
          <div className="hidden md:block absolute top-5 left-[12%] right-[12%] h-px bg-border" />
          {[
            { n: "01", title: "Assign", desc: "Mentor publishes tasks — auto-assigned to the active cohort.", accent: false },
            { n: "02", title: "Submit", desc: "Intern logs progress and submits work for review.", accent: false },
            { n: "03", title: "Review", desc: "Mentor approves or sends it back with a reason.", accent: false },
            { n: "04", title: "Feedback", desc: "A rating and written note land on the intern's dashboard.", accent: true },
          ].map((step) => (
            <div key={step.n} className="relative text-center">
              <div className={`w-10 h-10 mx-auto rounded-full text-white flex items-center justify-center font-bold text-sm mb-4 relative z-10 ${step.accent ? "bg-accent" : "bg-primary"}`}>
                {step.n}
              </div>
              <h3 className="font-semibold mb-1.5 text-sm text-foreground">{step.title}</h3>
              <p className="text-xs text-muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-accent-soft py-14">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "11", label: "Data models tracked" },
            { value: "2", label: "Roles, fully separated" },
            { value: "100%", label: "API-enforced access" },
            { value: "0", label: "Records ever deleted" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-extrabold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 text-white bg-dark-bg">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-5 gap-12">
          <div className="md:col-span-2">
            <p className="text-xs font-semibold mb-4 tracking-wide text-accent">WHY IT&apos;S BUILT THIS WAY</p>
            <p className="text-2xl font-semibold leading-snug">
              &quot;An intern should never be able to see another intern&apos;s feedback —
              not because it&apos;s hidden in the UI, but because the API refuses to return it.&quot;
            </p>
            <p className="text-sm mt-4 text-dark-muted">Access control principle, carried from Week 6 into every screen.</p>
          </div>
          <div className="md:col-span-3 space-y-6">
            {[
              { letter: "A", title: "AI-assisted drafting", desc: "Mentor describes intent in plain language; the AI returns a structured task ready to edit and publish." },
              { letter: "B", title: "Role-checked at the API, not the UI", desc: "Every route verifies the JWT and the membership before returning a single row." },
              { letter: "C", title: "Archived, never erased", desc: "Past cohorts stay queryable — the system is designed to outlive this one intake." },
            ].map((item, i, arr) => (
              <div key={item.letter} className={`flex gap-4 items-start ${i < arr.length - 1 ? "border-b border-dark-border pb-6" : ""}`}>
                <span className="font-bold text-sm mt-0.5 text-accent">{item.letter}</span>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-dark-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-muted">
          <span>© 2026 Musketeer Tech — Internal Use Only</span>
          <span>Intern Management Platform</span>
        </div>
      </footer>
    </div>
  );
}