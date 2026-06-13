import { Router } from "express";
import { createChartLog, listCharts, updateChart, viewChartFile } from "../controllers/chartController.js";
import { requireAuth } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorizeRoles.js";
import { auditAction } from "../middleware/auditAction.js";
import { sensitiveApiRateLimiter } from "../middleware/rateLimiters.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { chartLogSchema, chartUpdateSchema } from "../validation/chartSchemas.js";

const router = Router();

router.use(requireAuth);
router.get("/", requireRole(["admin", "staff"]), asyncHandler(listCharts));
router.get("/files/:fileName", requireRole(["admin", "staff"]), asyncHandler(viewChartFile));
router.patch(
  "/:id",
  requireRole(["admin", "staff"]),
  sensitiveApiRateLimiter,
  validateRequest(chartUpdateSchema),
  auditAction("chart_updated", (req) => ({ chartId: req.params.id })),
  asyncHandler(updateChart),
);
router.post(
  "/logs",
  requireRole(["admin", "staff"]),
  sensitiveApiRateLimiter,
  validateRequest(chartLogSchema),
  auditAction("chart_log_created", (req) => ({ caseNumber: req.body.caseNumber, action: req.body.action })),
  asyncHandler(createChartLog),
);

export default router;
