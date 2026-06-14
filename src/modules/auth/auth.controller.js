import * as authService from "./auth.service.js";

// ---------- Register ----------

export async function register(req, res) {
  try {
    const { email, password } = req.body;

    // basic input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const { accessToken, refreshToken, user } = await authService.registerUser({
      email,
      password,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // JS cannot access this cookie
      secure: true, // only sent over HTTPS
      sameSite: "strict", // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        accessToken,
        refreshToken, // ← add this
        user,
      },
    });
  } catch (err) {
    if (err.message === "Email already registered") {
      return res.status(409).json({
        success: false,
        message: err.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// ---------- Login ----------

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const { accessToken, refreshToken, user } = await authService.loginUser({
      email,
      password,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        refreshToken, // ← add this
        user,
      },
    });
  } catch (err) {
    if (err.message === "Invalid email or password") {
      return res.status(401).json({
        success: false,
        message: err.message,
      });
    }

    if (err.message === "Account is deactivated") {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// ---------- Refresh ----------

export async function refresh(req, res) {
  try {
    // React Native sends in body, browsers send via cookie
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "No refresh token provided",
      });
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    } = await authService.refreshAccessToken(refreshToken);

    // still set cookie for browser clients
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken, // ← React Native needs this in body
        user,
      },
    });
  } catch (err) {
    res.clearCookie("refreshToken");
    return res.status(401).json({
      success: false,
      message: "Session expired, please login again",
    });
  }
}

// ---------- Logout ----------

export async function logout(req, res) {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (refreshToken) {
      await authService.logoutUser(refreshToken); // revoke in DB
    }

    res.clearCookie("refreshToken"); // remove from browser

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// ---------- Logout All Devices ----------

export async function logoutAll(req, res) {
  try {
    // req.user comes from auth middleware — protected route
    await authService.logoutAllDevices(req.user._id);

    res.clearCookie("refreshToken");

    return res.status(200).json({
      success: true,
      message: "Logged out from all devices",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// add this to modules/auth/auth.controller.js

// ---------- Get Current User ----------

export async function getMe(req, res) {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
