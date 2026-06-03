import crypto from "crypto";
import { encryptionConfig } from "../config/jwt.config";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(encryptionConfig.key, "hex"); // 32 bytes = 64 hex chars

export const encrypt = (plaintext) => {
  const iv = crypto.randomBytes(12); // 96-bit IV, recommended for GCM

  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag(); // 16-byte GCM authentication tag

  return {
    iv: iv.toString("hex"),
    encryptedData: encrypted.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

export const decrypt = ({ iv, encryptedData, authTag }) => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(iv, "hex"),
  );

  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData, "hex")),
    decipher.final(), // throws if authTag is wrong (tampered data)
  ]);

  return decrypted.toString("utf8");
}
