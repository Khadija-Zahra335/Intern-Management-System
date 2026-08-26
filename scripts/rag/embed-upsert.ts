// Reads chunks.json, embeds every chunk with Cohere, upserts to Pinecone
// under the capstone-analytics namespace (kept separate from the
// Ask-My-Internship chatbot's vectors, which live in the default
// namespace of the same index).
//
// Run from the repo root with:  npx tsx scripts/rag/embed-upsert.ts

import fs from "fs";
import dotenv from "dotenv";
import { CohereClient } from "cohere-ai";
import { Pinecone } from "@pinecone-database/pinecone";

dotenv.config({ path: ".env.local" });

const CHUNKS_FILE = "./scripts/rag/chunks.json";
const NAMESPACE = process.env.PINECONE_NAMESPACE || "capstone-analytics";

// Cohere accepts up to 96 texts per request.
const EMBED_BATCH = 96;
// Pinecone recommends batching upserts too.
const UPSERT_BATCH = 100;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name} in .env.local`);
    process.exit(1);
  }
  return value;
}

const cohere = new CohereClient({ token: requireEnv("COHERE_API_KEY") });
const pinecone = new Pinecone({ apiKey: requireEnv("PINECONE_API_KEY") });
const index = pinecone.index(requireEnv("PINECONE_INDEX"));
const ns = index.namespace(NAMESPACE);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Chunk {
  id: string;
  text: string;
  metadata: Record<string, string | number>;
}

async function run() {
  const chunks: Chunk[] = JSON.parse(fs.readFileSync(CHUNKS_FILE, "utf-8"));
  console.log(`Loaded ${chunks.length} chunks for namespace "${NAMESPACE}"\n`);

  // ---------------------------------------------------------------
  // 1. Embed
  // input_type: "search_document" — same reasoning as Ask-My-Internship's
  // embed.js. The query side must use "search_query" to match.
  // ---------------------------------------------------------------
  const vectors: { id: string; values: number[]; metadata: Record<string, string | number> }[] = [];

  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const batchNum = Math.floor(i / EMBED_BATCH) + 1;

    console.log(`Embedding batch ${batchNum} (${batch.length} chunks)...`);

    const response = await cohere.embed({
      texts: batch.map((c) => c.text),
      model: "embed-english-v3.0",
      inputType: "search_document",
    });

    const embeddings = response.embeddings as number[][];

    if (embeddings.length !== batch.length) {
      console.error("Embedding count did not match chunk count. Stopping.");
      process.exit(1);
    }

    // Sanity check: the shared index was created with dimension 1024.
    if (batchNum === 1) {
      console.log(`  vector dimension: ${embeddings[0].length}`);
      if (embeddings[0].length !== 1024) {
        console.error("Dimension is not 1024 — this will not match the index.");
        process.exit(1);
      }
    }

    for (let j = 0; j < batch.length; j++) {
      vectors.push({ id: batch[j].id, values: embeddings[j], metadata: batch[j].metadata });
    }

    if (i + EMBED_BATCH < chunks.length) await sleep(1000);
  }

  console.log(`\nEmbedded ${vectors.length} chunks\n`);

  // ---------------------------------------------------------------
  // 2. Upsert — same version-shape fallback as Ask-My-Internship's
  // embed.js, scoped to the capstone-analytics namespace.
  // ---------------------------------------------------------------
    async function upsertBatch(batch: typeof vectors) {
    await ns.upsert({ records: batch });
  }

  for (let i = 0; i < vectors.length; i += UPSERT_BATCH) {
    const batch = vectors.slice(i, i + UPSERT_BATCH);
    console.log(`Upserting ${batch.length} vectors into "${NAMESPACE}"...`);
    await upsertBatch(batch);
  }
  console.log("\nUpsert complete.");

  // ---------------------------------------------------------------
  // 3. Verify — Pinecone is eventually consistent, so wait before checking.
  // ---------------------------------------------------------------
  console.log("Waiting 10s for Pinecone to index...");
  await sleep(10000);

  const stats = await index.describeIndexStats();
  const nsStats = stats.namespaces?.[NAMESPACE];
  console.log(`\nVectors in namespace "${NAMESPACE}": ${nsStats?.recordCount ?? 0}`);
  console.log(`Expected:                              ${vectors.length}`);
  console.log(`Total vectors across whole index:       ${stats.totalRecordCount}`);
}

run().catch((err) => {
  console.error("\nFailed:", err.message || err);
  process.exit(1);
});