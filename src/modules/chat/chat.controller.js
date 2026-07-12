import * as chatService from "./chat.service.js";

export async function query(req, res) {
  try {
    const { question } = req.body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required and must be a non-empty string",
      });
    }

    const { answer, sources } = await chatService.answerQuestion(question.trim());

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
