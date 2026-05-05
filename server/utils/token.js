import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const accessSecret = () => env.jwtSecret || "development-only-access-secret";
const refreshSecret = () => env.refreshTokenSecret || "development-only-refresh-secret";

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id || user.email,
      email: user.email,
      role: user.role,
    },
    accessSecret(),
    { expiresIn: env.accessTokenTtl },
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id || user.email,
      email: user.email,
      role: user.role,
      type: "refresh",
    },
    refreshSecret(),
    { expiresIn: env.refreshTokenTtl },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, accessSecret());
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret());
}
