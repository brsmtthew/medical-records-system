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

export const authenticate = requireAuth;
