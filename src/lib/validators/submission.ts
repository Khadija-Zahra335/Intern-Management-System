import { z } from "zod";

export const createSubmissionSchema = z.object({
  content: z.string().min(1).optional(),
  links: z.array(z.string().url()).default([]),
});


export const reviewSubmissionSchema = z.object({
  reviewNote: z.string().min(1).optional(),
  decision: z.enum(["APPROVE", "REJECT"]),
});