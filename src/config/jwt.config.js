import dotenv from 'dotenv';
dotenv.config();

export const jwtConfig = {
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  refreshExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
};

export const encryptionConfig = {
  key: process.env.ENCRYPTION_KEY, // must be 32-byte hex string
};