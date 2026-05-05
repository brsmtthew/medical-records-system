import fs from "fs/promises";
import path from "path";

import { env } from "../config/env.js";
import { httpError } from "../utils/httpError.js";
import { writeAuditLog } from "../utils/auditLogger.js";

export async function listCharts(_req, res) {
  res.status(200).json({ data: [] });
}

export async function createChartLog(req, res) {
  res.status(201).json({ data: req.body, message: "Chart log accepted." });
}

export async function updateChart(req, res) {
  res.status(200).json({ id: req.params.id, ...req.body, message: "Chart updated." });
}

export async function viewChartFile(req, res) {
  const safeFileName = path.basename(req.params.fileName);
  if (safeFileName !== req.params.fileName) {
    throw httpError(400, "Invalid chart file name.");
  }

  const chartDir = path.resolve(env.chartFilesDir);
  const filePath = path.resolve(chartDir, safeFileName);
  if (!filePath.startsWith(chartDir + path.sep)) {
    throw httpError(400, "Invalid chart file path.");
  }

  try {
    await fs.access(filePath);
  } catch {
    throw httpError(404, "Chart file not found.");
  }

  await writeAuditLog("chart_viewed", req, { fileName: safeFileName });
  res.sendFile(filePath);
}
