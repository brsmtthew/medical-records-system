import { writeAuditLog } from "../utils/auditLogger.js";

export function auditAction(action, metadataBuilder = () => ({})) {
  return async (req, _res, next) => {
    try {
      await writeAuditLog(action, req, metadataBuilder(req));
    } catch (error) {
      console.error("Unable to write audit log:", error);
    }
    next();
  };
}
