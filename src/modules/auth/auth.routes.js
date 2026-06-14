import express from "express";
import * as authController from "./auth.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { authLimiter } from "../../middleware/rateLimiter.js";
import { refreshLimiter } from "../../middleware/rateLimiter.js";

const router = express.Router();

// public routes with rate limiting
router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/refresh", refreshLimiter, authController.refresh);
router.post("/logout", authLimiter, authController.logout);

// protected routes
router.post("/logout-all", protect, authController.logoutAll);
router.get('/me', protect, authController.getMe);

export default router;
