import { httpError } from "../utils/httpError.js";

export function notFoundHandler(req, _res, next) {
  next(httpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}
