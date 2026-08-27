import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, forbidden, unauthorized } from "@/lib/auth";
import { retrieveContext, formatContext, ChatTurn } from "@/lib/ragRetrieval";
import { checkRateLimit } from "@/lib/assistantRateLimiter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOTAL_LENGTH = 20000;
const MAX_MESSAGES = 40;
const GROQ_TIMEOUT_MS = 15000;

// Same model already used for AI task drafting elsewhere in this app —
// more reasoning power than the quick query-rewrite step in ragRetrieval.ts needs.
const ANSWER_MODEL = "openai/gpt-oss-20b";

const ALLOWED_ROLES = ["user", "assistant"];

// Used any time retrieval found at least one record — whether it's a
// confident match or just the closest thing on file. One prompt, not two:
// an earlier version split this into a "grounded" prompt and a separate
// "partial match" prompt that was forced to open with a flat "I don't have
// records for that" before describing the (often genuinely relevant) data
// underneath it — e.g. asking "who needs improvement" would get "I don't
// have records for that. [Then a full paragraph about the intern who's
// blocked and behind.]" — a real answer, dressed up as a non-answer. That
// self-contradiction is gone now: the model always leads with whatever the
// records actually support, and only notes a coverage gap afterward, in
// the same breath, if one exists — never as a standalone opening denial.
const ANSWER_PROMPT = `You are an assistant helping a mentor review her interns' progress in a software engineering internship program, using real records pulled from the program's own database — task completion, ratings, mentor feedback comments, and check-in notes.

Answer using ONLY the records provided below.

Guidelines:
- Answer mentor-to-mentor: clear, direct, and professional.
- Use whatever the records below actually show to answer as helpfully as you can — including when they only partially cover the question (e.g. they're about some interns or weeks but not others asked about).
- Never lead with "I don't have records" or similar if there is genuinely relevant information below — give the real answer first. Only mention a gap in coverage afterward, briefly, and only if one actually exists.
- If the records truly don't relate to the question at all, say so plainly and suggest asking about a specific intern, week, or cohort.
- Do not add explanations or information from your own general knowledge, and never invent or guess a name, rating, or detail not present in the records.
- Always say which intern and which week the information comes from.
- Write in your own words rather than copying the records verbatim.
- Keep answers under 250 words.
- Use plain language and light formatting.`;

const NO_MATCH_PROMPT = `You are an assistant for a mentor dashboard that only answers questions using real intern records from the program's database.

No records at all were found for this question — the database has nothing related to it.

Guidelines:
- Say clearly and briefly that you don't have any records matching this question.
- Suggest asking about a specific intern, week, or cohort if that would help.
- Do NOT answer from general knowledge, and do NOT guess or invent any name, rating, or detail.
- Keep it under 60 words.`;

function validateMessages(messages: unknown): string | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "Invalid request format.";
  }
  if (messages.length > MAX_MESSAGES) {
    return "This conversation is too long. Please start a new chat.";
  }

  let totalLength = 0;
  for (const msg of messages) {
    if (!msg || typeof msg !== "object") return "Invalid message format.";
    const m = msg as { role?: unknown; content?: unknown };
    if (!ALLOWED_ROLES.includes(m.role as string)) return "Invalid message role.";
    if (typeof m.content !== "string") return "Invalid message content.";
    if (m.content.trim().length === 0) return "Messages cannot be empty.";
    if (m.content.length > MAX_MESSAGE_LENGTH) {
      return `Message too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`;
    }
    totalLength += m.content.length;
  }

  if (totalLength > MAX_TOTAL_LENGTH) {
    return "This conversation is too long. Please start a new chat.";
  }

  if ((messages[messages.length - 1] as { role: string }).role !== "user") {
    return "Invalid conversation order.";
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return unauthorized();
    if (user.role !== "MENTOR") return forbidden();

    const limit = checkRateLimit(user.userId);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "You're sending messages a bit fast. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    let body: { messages?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const validationError = validateMessages(body.messages);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const chatMessages = body.messages as ChatTurn[];
    const question = chatMessages[chatMessages.length - 1].content;

    const { chunks, grounded, searchQuery } = await retrieveContext(
      question,
      chatMessages.slice(0, -1)
    );

    console.log(
      `[RAG] "${question}" -> "${searchQuery}" -> ${chunks.length} chunks` +
        (chunks.length ? ` (top ${chunks[0].score.toFixed(3)})` : "")
    );

           const systemPrompt =
      chunks.length > 0 ? `${ANSWER_PROMPT}\n\nRECORDS:\n\n${formatContext(chunks)}` : NO_MATCH_PROMPT;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

    let groqResponse: Response;
    try {
      groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: ANSWER_MODEL,
          messages: [{ role: "system", content: systemPrompt }, ...chatMessages],
          temperature: 0.3,
          max_tokens: 800,
          stream: true,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return NextResponse.json(
          { error: "The AI service took too long to respond. Please try again." },
          { status: 504 }
        );
      }
      console.error("Could not reach Groq:", err);
      return NextResponse.json(
        { error: "Could not reach the AI service. Please check your connection and try again." },
        { status: 503 }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!groqResponse.ok || !groqResponse.body) {
      console.error(`Groq returned ${groqResponse.status}`);
      let message = "The AI service is having trouble. Please try again shortly.";
      if (groqResponse.status === 429) {
        message = "The AI service is busy right now. Please wait a moment and try again.";
      } else if (groqResponse.status === 401 || groqResponse.status === 403) {
        message = "The AI service is unavailable. Please try again later.";
      }
      return NextResponse.json({ error: message }, { status: 502 });
    }

    // Sent as headers, not in the body — the body is about to become a raw
    // text stream with no room for structured data alongside it.
    const sources = chunks.map((c) => ({
      intern: c.intern,
      week: c.week,
      type: c.type,
      score: Number(c.score.toFixed(3)),
    }));

    return new Response(groqResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "X-RAG-Grounded": grounded ? "true" : "false",
        "X-RAG-Sources": encodeURIComponent(JSON.stringify(sources)),
      },
    });
  } catch (error) {
    console.error("Assistant chat route error:", error);
    return NextResponse.json(
      { error: "Something went wrong on the server. Please try again." },
      { status: 500 }
    );
  }
}