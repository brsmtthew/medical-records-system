import { z } from "zod";

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(160, "Password is too long.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.");

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Enter a valid email address.").max(160),
    password: z.string().min(1, "Password is required.").max(160),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Enter a valid email address.").max(160),
    fullName: z.string().trim().min(2, "Full name is required.").max(120),
    password: strongPassword,
    confirmPassword: z.string().min(1, "Confirm password is required."),
    role: z.enum(["admin", "staff"]).default("staff"),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }).optional(),
});
