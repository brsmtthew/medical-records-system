import { httpError } from "../utils/httpError.js";

export function validateRequest(schema) {
  return (req, _res, next) => {
    if (typeof schema?.safeParse === "function") {
      const result = schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      if (!result.success) {
        return next(httpError(400, "Request validation failed.", result.error.errors.map((error) => error.message)));
      }

      req.validated = result.data;
      return next();
    }

    const errors = [];

    for (const [field, rules] of Object.entries(schema.body || {})) {
      const value = req.body?.[field];
      if (rules.required && (value === undefined || value === null || value === "")) {
        errors.push(`${field} is required.`);
        continue;
      }
      if (rules.type && value !== undefined && value !== null && typeof value !== rules.type) {
        errors.push(`${field} must be a ${rules.type}.`);
      }
      if (rules.maxLength && typeof value === "string" && value.length > rules.maxLength) {
        errors.push(`${field} must be ${rules.maxLength} characters or fewer.`);
      }
    }

    if (errors.length) {
      return next(httpError(400, "Request validation failed.", errors));
    }

    return next();
  };
}
