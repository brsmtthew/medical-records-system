import { httpError } from "../utils/httpError.js";

export function notFoundHandler(_req, _res, next) {
  next(httpError(404, "The requested resource was not found."));
}
