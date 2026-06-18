import { Router } from "express";
import { login, logout, me, refresh, register } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorizeRoles.js";
import { loginRateLimiter, sensitiveApiRateLimiter } from "../middleware/rateLimiters.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { loginSchema, registerSchema } from "../validation/authSchemas.js";

const router = Router();

router.post(
  "/login",
  loginRateLimiter,
  validateRequest(loginSchema),
  asyncHandler(login),
);
router.post(
  "/register",
  requireAuth,
  requireRole("admin"),
  sensitiveApiRateLimiter,
  validateRequest(registerSchema),
  asyncHandler(register),
);
router.post("/refresh", sensitiveApiRateLimiter, asyncHandler(refresh));
router.post("/logout", requireAuth, asyncHandler(logout));
router.get("/me", requireAuth, asyncHandler(me));

export default router;
