import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.config.js";

// Access Token ( It will be short lived )

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiry,
  });
};

export const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, jwtConfig.accessSecret);
    } catch (error) {
        throw new Error("Invalid access token");
    }
};


// Refresh Token ( It will be long lived )

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiry,
  });
};

export const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, jwtConfig.refreshSecret);
    } catch (error) {
        throw new Error("Invalid or expired refresh token");
    }
};
