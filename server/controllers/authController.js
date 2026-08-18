import bcrypt from "bcryptjs";
import { httpError } from "../utils/httpError.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/token.js";
import {
  consumeRefreshToken,
  revokeRefreshToken,
  saveRefreshToken,
} from "../models/refreshTokenStore.js";
import {
  createUser,
  findUserByEmail,
  toSafeUser,
  updateUser,
} from "../models/userStore.js";
import { writeAuditLog } from "../utils/auditLogger.js";

const maxFailedLogins = 5;
const lockoutMs = 15 * 60 * 1000;

function setRefreshCookie(res, token) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  saveRefreshToken(refreshToken, user);
  setRefreshCookie(res, refreshToken);
  return { accessToken };
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = findUserByEmail(email);

  if (!user) {
    await writeAuditLog("login_failed", req, { email });
    throw httpError(401, "Invalid email or password.");
  }

  if (user.accountStatus === "disabled") {
    await writeAuditLog("login_blocked_disabled", req, { email: user.email, role: user.role });
    throw httpError(403, "This account is disabled.");
  }

  if (user.lockedUntil && user.lockedUntil > Date.now()) {
    await writeAuditLog("login_blocked_locked", req, { email: user.email, role: user.role });
    throw httpError(423, "Account is temporarily locked. Try again later.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const failedLoginCount = (user.failedLoginCount || 0) + 1;
    const lockedUntil = failedLoginCount >= maxFailedLogins ? Date.now() + lockoutMs : 0;
    updateUser(user.email, { failedLoginCount, lockedUntil });
    await writeAuditLog("login_failed", req, { email: user.email, role: user.role, failedLoginCount });
    throw httpError(401, "Invalid email or password.");
  }

  updateUser(user.email, { failedLoginCount: 0, lockedUntil: 0, lastLoginAt: new Date().toISOString() });
  const session = issueSession(res, user);
  await writeAuditLog("login", req, { email: user.email, role: user.role });

  res.status(200).json({ ...session, user: toSafeUser(user) });
}

export async function register(req, res) {
  const { email, fullName, password, role } = req.body;

  try {
    const user = await createUser({ email, fullName, password, role });
    await writeAuditLog("user_created", req, { email: user.email, role: user.role });
    res.status(201).json({ user: toSafeUser(user) });
  } catch (error) {
    if (error.code === "USER_EXISTS") {
      throw httpError(409, "User already exists.");
    }
    if (error.code === "INVALID_ROLE") {
      throw httpError(400, "Role must be admin, staff, nurse, or doctor.");
    }
    throw error;
  }
}

export async function refresh(req, res) {
  const token = req.cookies?.refreshToken;
  if (!token) throw httpError(401, "Refresh token is required.");

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw httpError(401, "Refresh token is invalid or expired.");
  }

  const storedToken = consumeRefreshToken(token);
  if (!storedToken || storedToken.email !== payload.email) {
    throw httpError(401, "Refresh token is invalid.");
  }

  const user = findUserByEmail(payload.email);
  if (!user || user.accountStatus === "disabled") {
    throw httpError(401, "Refresh token is invalid.");
  }

  const session = issueSession(res, user);
  res.status(200).json({ ...session, user: toSafeUser(user) });
}

export async function logout(req, res) {
  const token = req.cookies?.refreshToken;
  if (token) revokeRefreshToken(token);
  res.clearCookie("refreshToken");
  if (req.user) {
    await writeAuditLog("logout", req, { email: req.user.email, role: req.user.role });
  }
  res.status(200).json({ message: "Logged out." });
}

export async function me(req, res) {
  res.status(200).json({ user: req.user });
}
