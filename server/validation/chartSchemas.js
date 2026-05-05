import { z } from "zod";

export const chartUpdateSchema = z.object({
  body: z.object({
    status: z.string().trim().max(40).optional(),
    borrowedBy: z.string().trim().max(120).optional(),
    department: z.string().trim().max(120).optional(),
  }),
});

export const chartLogSchema = z.object({
  body: z.object({
    caseNumber: z.string().trim().min(1, "Case number is required.").max(80),
    action: z.enum(["borrowed", "returned", "viewed", "canceled"]),
    patientName: z.string().trim().max(120).optional(),
  }),
});
