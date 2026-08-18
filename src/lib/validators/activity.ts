import { z } from "zod";

export const createActivitySchema = z.object({
  content: z.string().min(1),
  links: z.array(z.string().url()).default([]),
});