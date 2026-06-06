// repositories/user.repository.js
import db from "../../.././config/db.js";
import { createUserDocument } from "../models/user.model.js";
import { encrypt , decrypt } from "../../../utils/encryption.js";
import { COLLECTIONS } from "../../../config/collections.js";
import crypto from "crypto";

const getUsersCollection = () => db.collection(COLLECTIONS.USERS);

// ---------- Create ----------

export async function createUser({ email, passwordHash }) {
  const collection = getUsersCollection();

  const encryptedEmail = encrypt(email);

  // AstraDB can't query on encrypted fields directly , so we store a hash of the email for direct lookup.

  const emailHash = crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex');

  const userDoc = createUserDocument({
    email: encryptedEmail, // store encrypted
    passwordHash,
    emailHash
  });

  await collection.insertOne(userDoc);

  return { ...userDoc, email }; // return with plain email for immediate use
}

// ---------- Find by Email ----------

export async function findUserByEmail(email) {
  const collection = getUsersCollection();

  const emailHash = crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex');

  const doc = await collection.findOne({ emailHash }); // direct O(1) lookup
  if (!doc) return null;

  const decryptedEmail = decrypt(doc.email);
  return { ...doc, email: decryptedEmail };
}

// ---------- Find by ID ----------

export async function findUserById(userId) {
  const collection = getUsersCollection();

  const doc = await collection.findOne({ _id: userId });
  if (!doc) return null;

  const decryptedEmail = decrypt(doc.email);
  return { ...doc, email: decryptedEmail };
}

// ---------- Update ----------

export async function updateUser(userId, updates) {
  const collection = getUsersCollection();

  // if email is being updated, re-encrypt it
  if (updates.email) {
    updates.email = encrypt(updates.email);
  }

  updates.updatedAt = new Date().toISOString();

  await collection.updateOne({ _id: userId }, { $set: updates });

  return findUserById(userId);
}

// ---------- Delete ----------

export async function deleteUser(userId) {
  const collection = getUsersCollection();
  await collection.deleteOne({ _id: userId });
}
