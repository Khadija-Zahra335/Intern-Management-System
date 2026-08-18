import { z } from "zod";

export const addMemberSchema = z.object({
  email: z.string().email(),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;