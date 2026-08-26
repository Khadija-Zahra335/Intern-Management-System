import { prisma } from "@/lib/prisma";
import { weekDateRange } from "@/lib/week";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-20b";

export interface WeeklyInsight {
  hasActivity: boolean;
  summary: string;
  stats: {
    tasksAssigned: number;
    tasksCompleted: number;
    tasksBlocked: number;
    checkinNotes: number;
  };
}

export async function buildWeeklyInsight(membershipId: string, weekNumber: number): Promise<WeeklyInsight> {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { user: true, cohort: true },
  });

  if (!membership) {
    throw new Error("Membership not found");
  }

  const { start, end } = weekDateRange(membership.cohort.startDate, weekNumber);

  const [assignments, attendance] = await Promise.all([
    prisma.taskAssignment.findMany({
      where: {
        membershipId,
        task: {
          OR: [
            { startDate: { gte: start, lt: end } },
            { AND: [{ startDate: null }, { createdAt: { gte: start, lt: end } }] },
          ],
        },
      },
      include: { task: true },
    }),
    prisma.attendance.findMany({
      where: { membershipId, occurredAt: { gte: start, lt: end } },
    }),
  ]);

  const notes = attendance.filter((a) => a.note && a.note.trim().length > 0);

  const stats = {
    tasksAssigned: assignments.length,
    tasksCompleted: assignments.filter((a) => a.status === "COMPLETED").length,
    tasksBlocked: assignments.filter((a) => a.status === "BLOCKED").length,
    checkinNotes: notes.length,
  };

  const internName = membership.user.name.trim();
  const hasActivity = assignments.length > 0 || notes.length > 0;

  if (!hasActivity) {
    return {
      hasActivity: false,
      summary: `No tasks or check-in notes were recorded for ${internName} in Week ${weekNumber}.`,
      stats,
    };
  }

  const lines: string[] = [];
  for (const a of assignments) {
    lines.push(`- Task "${a.task.title}": ${a.status}`);
  }
  for (const a of notes) {
    lines.push(`- Check-in note: ${a.note}`);
  }

  if (!process.env.GROQ_API_KEY) {
    return {
      hasActivity: true,
      summary: "AI summary isn't configured on the server (missing GROQ_API_KEY). Raw activity is shown below.",
      stats,
    };
  }

  const prompt = `Intern: ${internName}
Week: ${weekNumber}

Activity this week:
${lines.join("\n")}

Write a short summary (3-4 sentences, plain prose, no headings or bullet points) that a mentor can read before writing this intern's weekly feedback. Mention what was completed, what's still in progress or blocked, and anything notable from the check-in notes. Be factual and neutral — do not invent details that aren't in the activity list above.`;

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "You summarize an intern's weekly activity for their mentor. Be concise, factual, and neutral." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      return { hasActivity: true, summary: "Couldn't generate an AI summary right now. Raw activity is shown below.", stats };
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return { hasActivity: true, summary: "Couldn't generate an AI summary right now. Raw activity is shown below.", stats };
    }

    return { hasActivity: true, summary: text, stats };
  } catch {
    return { hasActivity: true, summary: "Couldn't reach the AI service. Raw activity is shown below.", stats };
  }
}