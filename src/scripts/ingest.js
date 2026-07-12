import fs from "fs";
import path from "path";
import crypto from "crypto";
import { DataAPIClient } from "@datastax/astra-db-ts";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { cleanPage } from "../utils/cleanMdx.js";
import { chunkMarkdown } from "../utils/chunkMarkdown.js";
import { loadZustandDocs } from "../utils/loadZustandDocs.js";
import dotenv from "dotenv";

dotenv.config();

// --- SAFE FREE TIER CONFIGURATION ---
const EMBEDDING_MODEL = "gemini-embedding-2"; // Upgraded to Gemini Embedding 2
const BATCH_SIZE = 10;   // Max chunks per request to protect Token limits
const DELAY_MS = 5000;   // 5 second delay to protect Request Per Minute limits (Max ~12 RPM)
const PROGRESS_FILE = path.resolve(".ingest_zustand_progress.json");

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// Helper to create a unique fingerprint for each chunk
function generateHash(text) {
  return crypto.createHash("md5").update(text).digest("hex");
}

// Loads the set of already processed chunk hashes
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    const data = fs.readFileSync(PROGRESS_FILE, "utf-8");
    return new Set(JSON.parse(data));
  }
  return new Set();
}

// Saves the updated set of processed chunk hashes
function saveProgress(progressSet) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(Array.from(progressSet), null, 2));
}

// Initialize LangChain's Gemini Embeddings wrapper
const embeddings = new GoogleGenerativeAIEmbeddings({
  model: EMBEDDING_MODEL,
  apiKey: process.env.GEMINI_API_KEY,
  maxRetries: 5, // LangChain has built-in exponential backoff for minor network hiccups
});

async function main() {
  // 1. Load raw scraped pages
  const rawPages = await loadZustandDocs("./zustand_docs_raw");
  console.log(`Loaded ${rawPages.length} zustand pages`);

  // 2. Load progress state
  const completedHashes = loadProgress();
  console.log(`Found ${completedHashes.size} already ingested chunks from previous runs.`);

  // 3. Clean + chunk every page
  const allChunks = [];
  for (const page of rawPages) {
    const cleaned = cleanPage(page, { sourceRoot: "zustand_docs_raw" });
    if (!cleaned.body) continue;

    const chunks = await chunkMarkdown(cleaned.body, { title: cleaned.title });
    for (const chunk of chunks) {
      const chunkHash = generateHash(chunk.text);
      
      // ONLY add the chunk to our to-do list if it hasn't been embedded yet
      if (!completedHashes.has(chunkHash)) {
        allChunks.push({
          hash: chunkHash, // Store the hash so we can mark it done later
          text: chunk.text,
          heading: chunk.heading,
          title: cleaned.title,
          description: cleaned.description,
          sourcePath: cleaned.sourcePath,
        });
      }
    }
  }
  
  if (allChunks.length === 0) {
    console.log("No new chunks to process. Ingestion is fully complete! 🎉");
    return;
  }
  
  console.log(`${allChunks.length} chunks remaining to be ingested.`);

  // 4. Connect to AstraDB
  const client = new DataAPIClient(process.env.ASTRA_VECTOR_DB_TOKEN);
  const db = client.db(process.env.ASTRA_VECTOR_DB_URL);

  let collection;
  try {
    collection = await db.createCollection("zustand_docs", {
      vector: { dimension: 3072, metric: "cosine" },
    });
    console.log("Created new 'zustand_docs' vector collection");
  } catch (err) {
    collection = db.collection("zustand_docs");
    console.log("Using existing 'zustand_docs' collection");
  }

  // 5. Embed + insert in safe batches
  // Calculate absolute batch numbers for clearer logging
  const skippedBatches = Math.floor(completedHashes.size / BATCH_SIZE);
  const totalAbsoluteBatches = Math.ceil((completedHashes.size + allChunks.length) / BATCH_SIZE);
  
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const currentAbsoluteBatchNum = skippedBatches + Math.floor(i / BATCH_SIZE) + 1;

    console.log(`Processing batch ${currentAbsoluteBatchNum} of ${totalAbsoluteBatches}...`);

    // Fetch embeddings using LangChain
    const vectors = await embeddings.embedDocuments(batch.map((c) => c.text));

    // Prepare Astra DB docs
    const docs = batch.map((c, idx) => ({
      $vector: vectors[idx],
      text: c.text,
      heading: c.heading,
      title: c.title,
      description: c.description,
      sourcePath: c.sourcePath,
    }));

    // Insert to DB
    await collection.insertMany(docs);
    
    // Mark these specific chunks as fully complete in our progress file
    batch.forEach(c => completedHashes.add(c.hash));
    saveProgress(completedHashes);

    console.log(`✅ Batch ${currentAbsoluteBatchNum} inserted & progress saved.`);

    // Wait before the next batch to respect Free Tier Limits
    if (i + BATCH_SIZE < allChunks.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log("Ingestion complete ✅");
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});