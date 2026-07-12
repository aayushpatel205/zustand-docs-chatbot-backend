import express from "express";
import * as chatController from "./chat.controller.js";

const router = express.Router();

// TODO: re-add `protect` middleware after testing — see AGENTS.md
router.post("/query", chatController.query);

export default router;
