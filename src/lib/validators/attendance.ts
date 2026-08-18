// src/lib/validators/attendance.ts
import { z } from "zod";

export const logAttendanceSchema = z.object({
  membershipId: z.string().uuid(),
  type: z.enum([
    "CHECK_IN", "CHECK_OUT",
    "LUNCH_START", "LUNCH_END",
    "AFK_START", "AFK_END",
    "RELAX_START", "RELAX_END",
  ]),
  note: z.string().optional(),
});