import { Router } from "express";
import { listUsers, updateUserRole } from "../controllers/userController.js";
import { requireAuth } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorizeRoles.js";
import { sensitiveApiRateLimiter } from "../middleware/rateLimiters.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { auditAction } from "../middleware/auditAction.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { userRoleSchema } from "../validation/userSchemas.js";

const router = Router();

router.use(requireAuth);
router.get("/", requireRole("admin"), asyncHandler(listUsers));
router.patch(
  "/:id/role",
  requireRole("admin"),
  sensitiveApiRateLimiter,
  validateRequest(userRoleSchema),
  auditAction("user_role_updated", (req) => ({ targetUser: req.params.id, role: req.body.role })),
  asyncHandler(updateUserRole),
);

export default router;
