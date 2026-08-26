// Pulls structured data (task-completion, feedback ratings) and free-text
// data (check-in notes, feedback comments) from Postgres, converts the
// structured data into natural-language sentences, and writes every chunk
// to chunks.json for embed-upsert.ts to pick up.
//
// No API calls here — safe to re-run as many times as you like while
// tuning the wording, same as Ask-My-Internship's chunk.js.
//
// Run from the repo root with:  npx tsx scripts/rag/generate-chunks.ts

import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error(`Could not find .env.local at: ${envPath}`);
  console.error("Run this script from the project root folder — the one that contains package.json.");
  process.exit(1);
}

dotenv.config({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error(`.env.local was found at ${envPath}, but DATABASE_URL isn't set in it.`);
  console.error('Check it has a line like:  DATABASE_URL="postgresql://..."');
  process.exit(1);
}



const CHUNKS_FILE = "./scripts/rag/chunks.json";

const ATTENDANCE_LABELS: Record<string, string> = {
  CHECK_IN: "check-in",
  CHECK_OUT: "check-out",
  LUNCH_START: "lunch start",
  LUNCH_END: "lunch end",
  AFK_START: "AFK start",
  AFK_END: "AFK end",
  RELAX_START: "a break",
  RELAX_END: "end of break",
};

interface Chunk {
  id: string;
  text: string;
  metadata: {
    text: string;
    type: "task_completion" | "feedback" | "checkin_note";
    intern: string;
    cohort: string;
    cohortId: string;
    membershipId: string;
    week: number;
    rating?: number;
  };
}

async function main() {
  // Built directly here rather than importing src/lib/prisma: that file's
  // adapter-caching exists to survive Next.js dev-mode hot reloads, which
  // doesn't apply to a one-shot script — and importing it statically would
  // read process.env.DATABASE_URL before the dotenv.config() call above
  // has run (ES module imports are evaluated before this file's own
  // top-level code, regardless of source order).
  const { PrismaClient } = await import("@/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { computeWeekNumber } = await import("@/lib/weeks");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const memberships = await prisma.membership.findMany({
      select: {
        id: true,
        user: { select: { name: true } },
        cohort: { select: { id: true, name: true, startDate: true } },
        assignments: {
          select: {
            status: true,
            task: { select: { title: true, startDate: true } },
          },
        },
        feedback: {
          select: { id: true, weekNumber: true, rating: true, comment: true },
        },
        attendance: {
          where: { note: { not: null } },
          select: { id: true, type: true, occurredAt: true, note: true },
        },
      },
    });

    const chunks: Chunk[] = [];

    for (const m of memberships) {
      const internName = m.user.name.trim();
      const cohortName = m.cohort.name;

      // --- A. Weekly task-completion stats (structured -> text) ---
      const byWeek = new Map<number, { title: string; status: string }[]>();
      for (const a of m.assignments) {
        if (!a.task.startDate) continue; // no date -> can't attribute to a week
        const week = computeWeekNumber(m.cohort.startDate, a.task.startDate);
        if (!byWeek.has(week)) byWeek.set(week, []);
        byWeek.get(week)!.push({ title: a.task.title, status: a.status });
      }

      const sortedWeeks = [...byWeek.entries()].sort((a, b) => a[0] - b[0]);

      for (const [week, tasks] of sortedWeeks) {
        const completed = tasks.filter((t) => t.status === "COMPLETED");
        const blocked = tasks.filter((t) => t.status === "BLOCKED");
        const submitted = tasks.filter((t) => t.status === "SUBMITTED");
        const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS");
        const notStarted = tasks.filter((t) => t.status === "NOT_STARTED");

        let text = `${internName} completed ${completed.length}/${tasks.length} tasks in Week ${week} for the ${cohortName} cohort.`;
        if (blocked.length) text += ` Blocked: ${blocked.map((t) => t.title).join(", ")}.`;
        if (submitted.length) text += ` Awaiting review: ${submitted.map((t) => t.title).join(", ")}.`;
        if (inProgress.length) text += ` In progress: ${inProgress.map((t) => t.title).join(", ")}.`;
        if (notStarted.length) text += ` Not started: ${notStarted.map((t) => t.title).join(", ")}.`;

        chunks.push({
          id: `task-completion-${m.id}-w${week}`,
          text,
          metadata: {
            text,
            type: "task_completion",
            intern: internName,
            cohort: cohortName,
            cohortId: m.cohort.id,
            membershipId: m.id,
            week,
          },
        });
      }

      // --- B. Weekly feedback: rating (structured) + comment (free text) ---
      for (const f of m.feedback) {
        const text = `${internName} received a rating of ${f.rating}/5 in Week ${f.weekNumber} for the ${cohortName} cohort. Mentor feedback: "${f.comment}"`;
        chunks.push({
          id: `feedback-${f.id}`,
          text,
          metadata: {
            text,
            type: "feedback",
            intern: internName,
            cohort: cohortName,
            cohortId: m.cohort.id,
            membershipId: m.id,
            week: f.weekNumber,
            rating: f.rating,
          },
        });
      }

      // --- C. Check-in notes (free text) ---
      for (const att of m.attendance) {
        if (!att.note) continue;
        const week = computeWeekNumber(m.cohort.startDate, att.occurredAt);
        const eventLabel = ATTENDANCE_LABELS[att.type] ?? att.type;
        const text = `${internName} logged a note during ${eventLabel} in Week ${week} for the ${cohortName} cohort: "${att.note}"`;
        chunks.push({
          id: `checkin-note-${att.id}`,
          text,
          metadata: {
            text,
            type: "checkin_note",
            intern: internName,
            cohort: cohortName,
            cohortId: m.cohort.id,
            membershipId: m.id,
            week,
          },
        });
      }
    }

    fs.writeFileSync(CHUNKS_FILE, JSON.stringify(chunks, null, 2));

    const byType = chunks.reduce<Record<string, number>>((acc, c) => {
      acc[c.metadata.type] = (acc[c.metadata.type] ?? 0) + 1;
      return acc;
    }, {});

    console.log(`Wrote ${chunks.length} chunks to ${CHUNKS_FILE}`);
    console.log(byType);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});