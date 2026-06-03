import db from "../../config/db.js";
import { createRefreshTokenDocument } from "./refreshToken.model.js";
import { COLLECTIONS } from "../../config/collections.js";

const getRefreshTokensCollection = () =>
  db.collection(COLLECTIONS.REFRESH_TOKENS);

// ---------- Create ----------

export async function saveRefreshToken({ userId, token }) {
  const collection = getRefreshTokensCollection();

  const tokenDoc = createRefreshTokenDocument({ userId, token });

  await collection.insertOne(tokenDoc);
  return tokenDoc;
}

// ---------- Find by Token ----------

export async function findRefreshToken(token) {
  const collection = getRefreshTokensCollection();

  const doc = await collection.findOne({ token });
  return doc || null;
}

// ---------- Validate Token ----------
// single helper that checks existence + expiry + revocation

export async function validateRefreshToken(token) {
  const doc = await findRefreshToken(token);

  if (!doc) {
    throw new Error("Refresh token not found");
  }

  if (doc.isRevoked) {
    throw new Error("Refresh token has been revoked");
  }

  if (new Date() > new Date(doc.expiresAt)) {
    // clean up expired token
    await deleteRefreshToken(token);
    throw new Error("Refresh token has expired");
  }

  return doc; // valid token doc
}

// ---------- Revoke (logout) ----------

export async function revokeRefreshToken(token) {
  const collection = getRefreshTokensCollection();

  await collection.updateOne(
    { token },
    { $set: { isRevoked: true } }
  );
}

// ---------- Revoke All (logout from all devices) ----------

export async function revokeAllUserTokens(userId) {
  const collection = getRefreshTokensCollection();

  await collection.updateMany(
    { userId, isRevoked: false },
    { $set: { isRevoked: true } }
  );
}

// ---------- Delete (hard delete) ----------

export async function deleteRefreshToken(token) {
  const collection = getRefreshTokensCollection();
  await collection.deleteOne({ token });
}

// ---------- Delete All Expired (cleanup job) ----------

export async function deleteExpiredTokens() {
  const collection = getRefreshTokensCollection();

  await collection.deleteMany({
    expiresAt: { $lt: new Date().toISOString() },
  });
}
