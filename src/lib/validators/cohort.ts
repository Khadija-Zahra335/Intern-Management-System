// src/lib/validators/cohort.ts
import { z } from "zod";

export const createCohortSchema = z
  .object({
    name: z.string().min(1, "Cohort name is required"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });

export type CreateCohortInput = z.infer<typeof createCohortSchema>;