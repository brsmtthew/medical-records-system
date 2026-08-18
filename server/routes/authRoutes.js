import { Router } from "express";
import { login, logout, me, refresh, register } from "../controllers/authController.js";
import { optionalAuth, requireAuth } from "../middleware/authenticate.js";
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
// Logout must remain available after the short-lived access token expires so the
// refresh cookie can still be revoked. The controller safely handles requests
// with or without an authenticated access token.
router.post("/logout", sensitiveApiRateLimiter, optionalAuth, asyncHandler(logout));
router.get("/me", requireAuth, asyncHandler(me));

export default router;
