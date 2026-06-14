// middleware/rateLimiter.js
import rateLimit from "express-rate-limit";

// ---------- Auth Routes Limiter ----------
// strict — these routes are the most sensitive

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 attempts per 15 mins per IP
  standardHeaders: true,      // return rate limit info in headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts, please try again after 15 minutes',
  },
});

// ---------- Refresh Route Limiter ----------
// slightly looser — legitimate users hit this often (every 15 mins)

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 30,                    // 30 attempts per 15 mins per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many refresh attempts, please try again later',
  },
});

// ---------- General API Limiter ----------
// loose — just prevents abuse on general routes

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per 15 mins per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
});