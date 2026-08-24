import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// Kept as a local string-literal type rather than importing the generated
// Prisma enum, matching how Role/AssignmentStatus etc. are used elsewhere
// in this codebase (plain string literals, no generated-type imports
// outside prisma.ts).
export type AuthTokenPurpose = "PASSWORD_RESET" | "MAGIC_LOGIN";

const RAW_TOKEN_BYTES = 32;

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Creates a new single-use token for the given purpose, first invalidating
 * any other unused tokens of the same purpose for this user — so only the
 * most recently requested link is ever valid. Returns the raw token (only
 * ever available here, at creation time) to embed in the emailed link;
 * only its hash is persisted.
 */
export async function createAuthToken(
  userId: string,
  purpose: AuthTokenPurpose,
  ttlMinutes: number
): Promise<string> {
  const rawToken = crypto.randomBytes(RAW_TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await prisma.$transaction([
    prisma.authToken.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.authToken.create({
      data: { userId, purpose, tokenHash, expiresAt },
    }),
  ]);

  return rawToken;
}

/**
 * Looks up a raw token, checks it matches the expected purpose and is
 * unused and unexpired, then marks it used. Returns null for "invalid,
 * wrong purpose, expired, or already used" — callers deliberately don't
 * distinguish these cases in their response, so a bad token can't be used
 * to probe token state.
 */
export async function consumeAuthToken(
  rawToken: string,
  purpose: AuthTokenPurpose
): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.authToken.findUnique({ where: { tokenHash } });

  if (
    !record ||
    record.purpose !== purpose ||
    record.usedAt ||
    record.expiresAt < new Date()
  ) {
    return null;
  }

  await prisma.authToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { userId: record.userId };
}
