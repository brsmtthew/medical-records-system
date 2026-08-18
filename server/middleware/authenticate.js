import { httpError } from "../utils/httpError.js";
import { verifyAccessToken } from "../utils/token.js";

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return next(httpError(401, "Authentication token is required."));
  }

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return next(httpError(401, "Authentication token is invalid or expired."));
  }
}

// Hydrates a valid access-token identity when one is present, but deliberately
// allows logout to continue when that short-lived token has expired.
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // The refresh cookie can still be revoked even with an expired token.
    }
  }

  return next();
}

export const authenticate = requireAuth;
