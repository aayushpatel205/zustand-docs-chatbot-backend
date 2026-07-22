import { DataAPIClient } from "@datastax/astra-db-ts";
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { rewriteForSearch, contextualizeQuestion } from "./queryRewriter.js";
import dotenv from "dotenv";

dotenv.config();

const TOP_K = 5;
const SIMILARITY_THRESHOLD = 0.82;

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-2",
  apiKey: process.env.GEMINI_API_KEY,
});

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.3,
  maxRetries: 3,
});

let dbClient = null;
let collection = null;

async function getCollection() {
  if (collection) return collection;
  dbClient = new DataAPIClient(process.env.ASTRA_VECTOR_DB_TOKEN);
  const db = dbClient.db(process.env.ASTRA_VECTOR_DB_URL);
  collection = db.collection("zustand_docs");
  return collection;
}

export async function answerQuestion(question, history = []) {
  const col = await getCollection();

  const resolvedQuestion = history.length > 0
    ? await contextualizeQuestion(question, history)
    : question;

  const searchQuery = await rewriteForSearch(resolvedQuestion);
  const vector = await embeddings.embedQuery(searchQuery);

  const results = await col.find(
    {},
    {
      sort: { $vector: vector },
      limit: TOP_K,
      projection: { text: 1, heading: 1, title: 1, sourcePath: 1 },
      includeSimilarity: true,
    }
  ).toArray();

  const relevantResults = results.filter(r => (r.$similarity ?? 0) >= SIMILARITY_THRESHOLD);

  if (relevantResults.length === 0) {
    return {
      answer: "I couldn't find any relevant information in the Zustand documentation to answer that question.",
      sources: [],
    };
  }

  const context = relevantResults.map((r, i) => `[${i + 1}] ${r.text}`).join("\n\n");

  const systemPrompt =
    "You are a helpful Zustand documentation assistant. Answer the user's question based solely on the provided context from the official Zustand documentation. " +
    "If the context doesn't contain enough information to answer the question, say so clearly. " +
    "Always reference the source document title and section heading when citing information. " +
    "Be concise and include relevant code examples when available.";

  const prompt = `Context:\n${context}\n\nQuestion: ${resolvedQuestion}`;

  const response = await llm.invoke([
    ["system", systemPrompt],
    ["human", prompt],
  ]);

  const answer = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  const sources = relevantResults.map((r) => ({
    title: r.title,
    heading: r.heading,
    sourcePath: r.sourcePath,
  }));

  return { answer, sources };
}
