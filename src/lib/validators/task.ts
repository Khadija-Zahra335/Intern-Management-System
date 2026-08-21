// src/lib/validators/task.ts
import { z } from "zod";

export const createTaskSchema = z
  .object({
    cohortId: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })

  
  .refine((data) => data.endDate > data.startDate, {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });

  export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const draftTaskSchema = z.object({
  topic: z.string().trim().min(3, "Describe the topic in a bit more detail so the AI has something to work with"),
});