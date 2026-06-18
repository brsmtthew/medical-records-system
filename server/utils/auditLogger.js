import fs from "fs/promises";
import { env } from "../config/env.js";

export async function writeAuditLog(action, req, metadata = {}) {
  const entry = {
    action,
    actor: req.user?.email || metadata.email || "anonymous",
    role: req.user?.role || metadata.role || "unknown",
    ip: req.ip,
    userAgent: req.get("user-agent") || "",
    metadata,
    timestamp: new Date().toISOString(),
  };

  await fs.appendFile(env.auditLogPath, `${JSON.stringify(entry)}\n`, "utf8");
}
