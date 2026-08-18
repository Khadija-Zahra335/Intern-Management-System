import { z } from "zod";

export const logLinkedInPostSchema = z.object({
  membershipId: z.string().uuid(),
  weekNumber: z.number().int().positive(),
  url: z.string().url(),
});