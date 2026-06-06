import {
  createUser,
  findUserByEmail,
  findUserById,
} from "../user/repositories/user.repository.js";
import {
  saveRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from "./repositories/refreshToken.repository.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/token.js";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

// ---------- Register ----------

export async function registerUser({ email, password }) {
  // 1. check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error('Email already registered');
  }

  // 2. hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // 3. create user in DB
  const user = await createUser({ email, passwordHash });

  // 4. generate tokens
  const accessToken = generateAccessToken({ userId: user._id, email: user.email });
  const refreshToken = generateRefreshToken({ userId: user._id });

  // 5. save refresh token to DB
  await saveRefreshToken({ userId: user._id, token: refreshToken });

  return { accessToken, refreshToken, user };
}

// ---------- Login ----------

export async function loginUser({ email, password }) {
  // 1. find user — keep passwordHash here, we need it for bcrypt
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password'); // vague on purpose — don't reveal which field is wrong
  }

  // 2. check if account is active
  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  // 3. verify password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  // 4. strip passwordHash — never use it beyond this point
  const { passwordHash, ...safeUser } = user;

  // 5. generate tokens
  const accessToken = generateAccessToken({ userId: safeUser._id, email: safeUser.email });
  const refreshToken = generateRefreshToken({ userId: safeUser._id });

  // 6. save refresh token to DB
  await saveRefreshToken({ userId: safeUser._id, token: refreshToken });

  return { accessToken, refreshToken, user: safeUser };
}

// ---------- Refresh Access Token ----------

export async function refreshAccessToken(refreshToken) {
  // 1. verify JWT signature first — cheap check before hitting DB
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new Error('Invalid refresh token');
  }

  // 2. validate against DB — checks exists + not revoked + not expired
  await validateRefreshToken(refreshToken);

  // 3. get fresh user data
  const user = await findUserById(decoded.userId);
  if (!user || !user.isActive) {
    throw new Error('User no longer exists');
  }

  // 4. issue new access token
  const newAccessToken = generateAccessToken({ userId: user._id, email: user.email });

  return { accessToken: newAccessToken, user };
}

// ---------- Logout ----------

export async function logoutUser(refreshToken) {
  // revoke this specific refresh token (single device logout)
  await revokeRefreshToken(refreshToken);
}

// ---------- Logout All Devices ----------

export async function logoutAllDevices(userId) {
  // revoke every refresh token for this user
  await revokeAllUserTokens(userId);
}

