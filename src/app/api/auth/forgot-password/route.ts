import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validators/auth";
import { createAuthToken } from "@/lib/authTokens";
import { sendPasswordResetEmail } from "@/lib/email";

const GENERIC_MESSAGE =
  "If an account exists for that email, we've sent a password reset link.";
const RESET_TTL_MINUTES = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond the same way whether or not the account exists, so
    // this endpoint can't be used to discover who's registered.
    if (user) {
      const rawToken = await createAuthToken(user.id, "PASSWORD_RESET", RESET_TTL_MINUTES);
      const resetUrl = `${process.env.APP_URL}/reset-password?token=${rawToken}`;
      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch (emailError) {
        // Don't leak email-provider failures to the client — same generic
        // response either way. Logged here so it's visible server-side.
        console.error("Failed to send password reset email:", emailError);
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
