// server.js
import express from 'express';
import cors from "cors";
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from "./src/modules/auth/auth.routes.js";
import { apiLimiter } from './src/middleware/rateLimiter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middleware ----------

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());          // parse JSON request bodies
app.use(cookieParser());          // parse cookies — needed for refreshToken cookie
app.use('/api', apiLimiter); 

// ---------- Routes ----------

app.use('/api/auth', authRoutes);

// ---------- Health Check ----------

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

// ---------- 404 Handler ----------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
});

// ---------- Global Error Handler ----------

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong',
  });
});

// ---------- Start Server ----------

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;