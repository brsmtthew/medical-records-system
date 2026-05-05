import dotenv from "dotenv";
import path from "path";

dotenv.config();

const projectRoot = path.resolve(process.cwd(), "..");

export const env = {
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  auditLogPath: process.env.AUDIT_LOG_PATH || path.resolve(process.cwd(), "logs", "audit.log"),
  chartFilesDir: process.env.CHART_FILES_DIR || path.resolve(projectRoot, "private", "charts"),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173",
  jwtSecret: process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || "7d",
};

if ((!env.jwtSecret || !env.refreshTokenSecret) && env.nodeEnv === "production") {
  throw new Error("JWT_SECRET and REFRESH_TOKEN_SECRET are required in production.");
}
