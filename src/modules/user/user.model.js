// models/user.model.js
import { v4 as uuidv4 } from "uuid";

export function createUserDocument({ email, passwordHash , emailHash }) {
  return {
    _id: uuidv4(),
    email,            // will be { iv, encryptedData, authTag } after encryption
    passwordHash,     // bcrypt hash
    emailHash,        // sha256 hash for lookup
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}