import { z } from "zod";

export const userRoleSchema = z.object({
  body: z.object({
    role: z.enum(["admin", "staff"]),
  }),
});
