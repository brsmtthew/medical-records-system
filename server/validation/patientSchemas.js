import { z } from "zod";

const patientBodySchema = z.object({
    name: z.string().trim().min(2, "Patient name is required.").max(120),
    caseNumber: z.string().trim().min(1, "Case number is required.").max(80),
    department: z.string().trim().max(120).optional(),
    type: z.enum(["inpatient", "outpatient"]),
    admissionDate: z.string().trim().max(30).optional(),
    dischargeDate: z.string().trim().max(30).optional(),
});

export const patientCreateSchema = z.object({
  body: patientBodySchema,
});

export const patientUpdateSchema = z.object({
  body: patientBodySchema.partial(),
});
