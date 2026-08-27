// Retrieval step for the mentor's conversational analytics assistant.
//
// Given a mentor's question, this returns the most relevant chunks from
// the capstone-analytics Pinecone namespace — real facts about real
// interns, pulled from generate-chunks.ts / embed-upsert.ts. It does NOT
// decide what to tell the AI to do with those chunks; that's the chat
// route's job (src/app/api/assistant/chat/route.ts).

import { CohereClient } from "cohere-ai";
import { Pinecone } from "@pinecone-database/pinecone";

const NAMESPACE = process.env.PINECONE_NAMESPACE || "capstone-analytics";

const CANDIDATES = 20; // how many nearest neighbors to pull from Pinecone
const TOP_K = 4; // how many to keep after reranking
const MIN_SCORE = 0.2; // rerank relevance cutoff for a confident "grounded" answer
const MIN_QUERY_LENGTH = 8; // shorter than this carries almost no meaning

// When nothing clears MIN_SCORE, we still surface this many of the closest
// candidates instead of returning empty-handed — real data, just not a
// confident match for the question asked. Lets the model tell the mentor
// what IS on file ("no Week 3 feedback, but here's Week 2") instead of the
// same generic "no records" reply for every question with thin data behind
// it. See PARTIAL_MATCH_PROMPT in the chat route.
const PARTIAL_MATCH_COUNT = 2;

// ---------------------------------------------------------------
// Clients — built lazily, on first use, and cached. This keeps env vars
// from being read before Next.js has populated them, and avoids paying
// for a client instance on every request.
// ---------------------------------------------------------------

let cohere: CohereClient | null = null;

function getCohere(): CohereClient {
  if (!cohere) {
    if (!process.env.COHERE_API_KEY) throw new Error("COHERE_API_KEY is not set");
    cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
  }
  return cohere;
}

function buildNamespace() {
  if (!process.env.PINECONE_API_KEY) throw new Error("PINECONE_API_KEY is not set");
  if (!process.env.PINECONE_INDEX) throw new Error("PINECONE_INDEX is not set");
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  return pc.index(process.env.PINECONE_INDEX).namespace(NAMESPACE);
}

let pineconeNamespace: ReturnType<typeof buildNamespace> | null = null;

function getPineconeNamespace() {
  if (!pineconeNamespace) {
    pineconeNamespace = buildNamespace();
  }
  return pineconeNamespace;
}

// ---------------------------------------------------------------
// Shape of the metadata every chunk was upserted with — see
// generate-chunks.ts. Pinecone stores metadata loosely typed, so we
// assert this shape ourselves; we're allowed to, since we're the ones
// who wrote it in the first place.
// ---------------------------------------------------------------

interface ChunkMetadata {
  text: string;
  type: "task_completion" | "feedback" | "checkin_note";
  intern: string;
  cohort: string;
  cohortId: string;
  membershipId: string;
  week: number;
  rating?: number;
}

export interface RetrievedChunk extends ChunkMetadata {
  score: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  grounded: boolean;
  searchQuery: string;
  failed?: boolean;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------
// Rewrites the mentor's question into a better search query, using
// recent conversation history to resolve follow-ups like "tell me more".
//
// This costs one extra, fast Groq call per message. Worth it: without
// it, a short follow-up question carries no real subject of its own and
// searches poorly on its own words alone.
// ---------------------------------------------------------------

async function rewriteQuery(question: string, history: ChatTurn[]): Promise<string> {
  try {
    const recent = history
      .slice(-4)
      .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
      .join("\n");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content: `Rewrite the mentor's question into a clear, standalone search query for a set of internship progress records — task completion, ratings, mentor feedback comments, and check-in notes about interns in a software internship program.

Rules:
- Fix spelling mistakes.
- Expand abbreviations into their full form as well as the short form.
- Turn vague questions into specific ones by adding likely subject terms (tasks, ratings, check-ins).
- Use the conversation history to resolve follow-ups like "tell me more", "why", or "what about last week".
- Keep intern names and week numbers exactly as given — never change or invent one.
- Output ONLY the rewritten query. No explanation, no quotes, no preamble.

Examples:
"hows ahmed doing" -> "How is Ahmed doing overall — his task completion, ratings, and any notes?"
"whos blocked" -> "Which interns currently have blocked tasks?"
"any red flags this week" -> "Are there any interns with low ratings, blocked tasks, or concerning check-in notes this week?"
"tell me more" -> (expand using the previous topic in the history)`,
          },
          {
            role: "user",
            content: recent
              ? `Conversation so far:\n${recent}\n\nRewrite this question: ${question}`
              : question,
          },
        ],
        temperature: 0,
        max_tokens: 60,
      }),
    });

    if (!res.ok) return question;

    const data = await res.json();
    const rewritten = data.choices?.[0]?.message?.content?.trim();

    if (!rewritten || rewritten.length < 5 || rewritten.length > 300) {
      return question;
    }

    return rewritten;
  } catch (error) {
    console.error("Query rewrite failed:", error);
    return question; // rewriting is an improvement, not a requirement
  }
}

// ---------------------------------------------------------------
// Main entry point: question in, relevant real chunks out.
// ---------------------------------------------------------------

export async function retrieveContext(
  question: string,
  history: ChatTurn[] = []
): Promise<RetrievalResult> {
  try {
    if (question.trim().length < MIN_QUERY_LENGTH) {
      return { chunks: [], grounded: false, searchQuery: question };
    }

    const searchQuery = await rewriteQuery(question, history);

    // inputType MUST be "search_query" here — the chunks were embedded
    // with "search_document" in embed-upsert.ts. Cohere's v3 models
    // optimize differently for each role; mismatching gives no error,
    // just quietly worse matches.
    const embedded = await getCohere().embed({
      texts: [searchQuery],
      model: "embed-english-v3.0",
      inputType: "search_query",
    });

    const vector = (embedded.embeddings as number[][])[0];

    const results = await getPineconeNamespace().query({
      vector,
      topK: CANDIDATES,
      includeMetadata: true,
    });

    const matches = results.matches || [];
    if (matches.length === 0) {
      return { chunks: [], grounded: false, searchQuery };
    }

    const reranked = await getCohere().rerank({
      model: "rerank-english-v3.0",
      query: searchQuery,
      documents: matches.map((m) => (m.metadata as unknown as ChunkMetadata).text),
      topN: TOP_K,
    });

        const strong = reranked.results.filter((r) => r.relevanceScore >= MIN_SCORE);

    // Nothing confidently answers the question — rather than discarding
    // everything, keep the closest candidate(s) anyway. Still real records,
    // just not necessarily the ones the mentor asked about; `grounded` stays
    // false so the chat route knows to caveat them instead of answering
    // as if they matched.
    const picked = strong.length > 0 ? strong : reranked.results.slice(0, PARTIAL_MATCH_COUNT);

    const chunks: RetrievedChunk[] = picked.map((r) => ({
      score: r.relevanceScore,
      ...(matches[r.index].metadata as unknown as ChunkMetadata),
    }));

    return { chunks, grounded: strong.length > 0, searchQuery };
  } catch (error) {
    // Retrieval failing should degrade the answer, not break the chat.
    console.error("Retrieval failed:", error);
    return { chunks: [], grounded: false, failed: true, searchQuery: question };
  }
}

export function formatContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c) => `[${c.type} — ${c.intern}, Week ${c.week}, ${c.cohort}]\n${c.text}`)
    .join("\n\n---\n\n");
}