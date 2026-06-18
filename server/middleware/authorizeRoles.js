import { httpError } from "../utils/httpError.js";

export function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!allowedRoles.length) {
    throw new Error("requireRole must be called with at least one role.");
  }

  return (req, _res, next) => {
    if (allowedRoles.includes(req.user?.role)) {
      return next();
    }
    return next(httpError(403, "You do not have permission to access this resource."));
  };
}
