import { httpError } from "../utils/httpError.js";

export function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, _res, next) => {
    if (!allowedRoles.length || allowedRoles.includes(req.user?.role)) {
      return next();
    }

    return next(httpError(403, "You do not have permission to access this resource."));
  };
}
