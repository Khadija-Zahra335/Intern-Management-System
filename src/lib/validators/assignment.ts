// src/lib/validators/assignment.ts
import { z } from "zod";

export const updateStatusSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "SUBMITTED", "COMPLETED"]),
});

export const addAssignmentSchema = z.object({
  membershipId: z.string().min(1, "membershipId is required"),
});