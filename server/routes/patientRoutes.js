import { Router } from "express";
import {
  createPatient,
  deletePatient,
  listPatients,
  updatePatient,
} from "../controllers/patientController.js";
import { requireAuth } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorizeRoles.js";
import { auditAction } from "../middleware/auditAction.js";
import { sensitiveApiRateLimiter } from "../middleware/rateLimiters.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { patientCreateSchema, patientUpdateSchema } from "../validation/patientSchemas.js";

const router = Router();

router.use(requireAuth);
router.get("/", requireRole(["admin", "staff"]), asyncHandler(listPatients));
router.post(
  "/",
  requireRole(["admin", "staff"]),
  sensitiveApiRateLimiter,
  validateRequest(patientCreateSchema),
  auditAction("patient_added", (req) => ({ caseNumber: req.body.caseNumber, patientName: req.body.name })),
  asyncHandler(createPatient),
);
router.patch(
  "/:id",
  requireRole("admin"),
  sensitiveApiRateLimiter,
  validateRequest(patientUpdateSchema),
  auditAction("patient_edited", (req) => ({ patientId: req.params.id })),
  asyncHandler(updatePatient),
);
router.delete(
  "/:id",
  requireRole("admin"),
  sensitiveApiRateLimiter,
  auditAction("patient_deleted", (req) => ({ patientId: req.params.id })),
  asyncHandler(deletePatient),
);

export default router;
