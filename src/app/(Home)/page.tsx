import Link from "next/link";
import Image from "next/image";
import { RoleTogglePreview } from "./RoleTogglePreview";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-white">
        <div className="px-6 md:px-12 lg:px-16 py-4 flex items-center justify-between">
          <a
            href="https://musketeerstech.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <div className="w-7 h-7 relative shrink-0">
              <Image src="/logo.png" alt="Musketeer Tech logo" fill className="object-contain" priority />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-foreground">Musketeer Tech</span>
          </a>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted">
              <a href="#workflow" className="hover:text-foreground">Workflow</a>
              <a href="#stats" className="hover:text-foreground">Overview</a>
              <a href="#about" className="hover:text-foreground">About</a>
            </div>
            <Link href="/login" className="rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-medium px-5 py-2.5 transition-colors">
              Sign In
            </Link>
          </div>
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
        <div className="relative px-6 md:px-12 lg:px-16 pt-20 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
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
            <p className="text-muted text-base mb-9 max-w-lg">
              Weekly tasks, progress check-ins, mentor feedback, and LinkedIn cadence —
              tracked the same way, every week, for every cohort.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/login" className="rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-6 py-3 transition-colors">
                Sign In
              </Link>
              <a href="#workflow" className="rounded-full bg-white border border-border text-foreground text-sm font-semibold px-6 py-3 hover:border-primary transition-colors">
                See the Workflow ↓
              </a>
            </div>
          </div>

          <div>
            <RoleTogglePreview />
          </div>
        </div>
      </section>

      <section id="workflow" className="px-6 md:px-12 lg:px-16 pb-20">
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

      <section id="stats" className="bg-accent-soft py-14">
        <div className="px-6 md:px-12 lg:px-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
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
        <div className="px-6 md:px-12 lg:px-16 grid md:grid-cols-5 gap-12">
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

      <section id="about" className="py-20 bg-white border-t border-border">
  <div className="px-6 md:px-12 lg:px-16 grid md:grid-cols-5 gap-12">
    <div className="md:col-span-2">
  <p className="text-xs font-bold mb-4 tracking-wide text-blue-800">ABOUT MUSKETEER TECH</p>

     <p className="text-2xl font-semibold leading-snug text-foreground">
        &quot;AI doesn&apos;t replace great engineering. It amplifies it.&quot;
      </p>
      <p className="text-sm mt-4 text-muted">
        An AI-native software development company based in Austin, Texas — pairing senior
        engineers with AI to build production-ready software faster.
      </p>
    </div>
    <div className="md:col-span-3 space-y-6">
      {[
        { letter: "A", title: "AI-native development", desc: "Custom AI agents, SaaS platforms, web apps, and intelligent automation, built for startups and scale-ups." },
        { letter: "B", title: "70+ projects delivered", desc: "From MVP validation to fractional CTO consulting, helping companies scale from early-stage to Series A and beyond." },
        { letter: "C", title: "Engineering-first, AI-accelerated", desc: "Senior engineers paired with modern AI techniques — aiming for 3x faster delivery without cutting corners." },
      ].map((item, i, arr) => (
        <div key={item.letter} className={`flex gap-4 items-start ${i < arr.length - 1 ? "border-b border-dark-border pb-6" : ""}`}>
          <span className="font-bold text-sm mt-0.5 text-accent">{item.letter}</span>
          <div>
            <h3 className="font-semibold mb-1">{item.title}</h3>
            <p className="text-sm text-white-muted">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>

      <footer className="py-8 border-t border-border">
        <div className="px-6 md:px-12 lg:px-16 flex items-center justify-between text-sm text-muted">
          <span>© 2026 Musketeer Tech — Internal Use Only</span>
          <span>Intern Management Platform</span>
        </div>
      </footer>
    </div>
  );
}