// middleware/auth.middleware.js
import { verifyAccessToken } from '../utils/token.js';
import { findUserById } from '../modules/user/repositories/user.repository.js';

export async function protect(req, res, next) {
  try {
    // 1. check authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    // 2. extract token from "Bearer <token>"
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    // 3. verify JWT signature + expiry
    const decoded = verifyAccessToken(token);
    // decoded = { userId, email, iat, exp }

    // 4. confirm user still exists + is active
    const user = await findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    // 5. attach user to request for downstream use
    req.user = user;
    next();

  } catch (err) {
    // verifyAccessToken throws these specific errors
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token expired',
        code: 'TOKEN_EXPIRED',  // frontend uses this code to trigger refresh
      });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}