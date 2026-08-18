import { z } from "zod";

export const upsertFeedbackSchema = z.object({
  membershipId: z.string().uuid(),
  weekNumber: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
});