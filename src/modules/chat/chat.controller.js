import * as chatService from "./chat.service.js";

export async function query(req, res) {
  try {
    const { question, history } = req.body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required and must be a non-empty string",
      });
    }

    if (history !== undefined) {
      if (!Array.isArray(history)) {
        return res.status(400).json({
          success: false,
          message: "history must be an array",
        });
      }
      for (const entry of history) {
        if (!entry.role || !entry.content) {
          return res.status(400).json({
            success: false,
            message: "Each history entry must have 'role' and 'content' fields",
          });
        }
        if (!["user", "assistant"].includes(entry.role)) {
          return res.status(400).json({
            success: false,
            message: "history entry role must be 'user' or 'assistant'",
          });
        }
      }
    }

    const { answer, sources } = await chatService.answerQuestion(question.trim(), history);

    return res.status(200).json({
      success: true,
      data: {
        answer,
        sources,
      },
    });
  } catch (err) {
    console.error("Chat query failed:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to process query",
    });
  }
}
