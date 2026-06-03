// models/refreshToken.model.js
import { v4 as uuidv4 } from 'uuid';

export function createRefreshTokenDocument({ userId, token, expiresIn = "7d" }) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // match your JWT expiry

  return {
    _id: uuidv4(),
    userId,       // reference to user._id
    token,        // the raw refresh token string
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  };
}