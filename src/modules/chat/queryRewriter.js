import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const rewriter = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0,
  maxRetries: 2,
});

const rewritePrompt =
  "You are a search query optimizer for Zustand documentation. " +
  "Rewrite the following question as a concise, effective search query " +
  "that will match documentation content.\n\n" +
  "Rules:\n" +
  "- Use Zustand-specific terminology (create, set, get, subscribe, middleware, etc.)\n" +
  "- Remove conversational filler ('I want to know', 'how can I', etc.)\n" +
  "- Keep it under 20 words\n" +
  "- Output ONLY the rewritten query, no explanation";

const contextualizePrompt =
  "Given the following conversation history and a follow-up question, " +
  "rephrase the follow-up as a standalone, self-contained question about Zustand.\n\n" +
  "Rules:\n" +
  "- Output ONLY the rephrased question, no explanation\n" +
  "- Make it specific enough to search documentation against\n" +
  "- If the follow-up is already standalone, return it as-is";

export async function rewriteForSearch(question) {
  try {
    const response = await rewriter.invoke([
      ["system", rewritePrompt],
      ["human", `Question: ${question}`],
    ]);

    const rewritten =
      typeof response.content === "string"
        ? response.content.trim()
        : null;

    return rewritten || question;
  } catch {
    return question;
  }
}

export async function contextualizeQuestion(question, history) {
  try {
    const historyText = history
      .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
      .join("\n");

    const response = await rewriter.invoke([
      ["system", contextualizePrompt],
      ["human", `History:\n${historyText}\n\nFollow-up: ${question}`],
    ]);

    const resolved =
      typeof response.content === "string"
        ? response.content.trim()
        : null;

    return resolved || question;
  } catch {
    return question;
  }
}
