import express from "express";
import * as authController from "./auth.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = express.Router();

// public routes
router.post('/register', authController.register);
router.post('/login',    authController.login);
router.post('/refresh',  authController.refresh);
router.post('/logout',   authController.logout);

// protected routes 
router.post('/logout-all', protect, authController.logoutAll);

export default router;