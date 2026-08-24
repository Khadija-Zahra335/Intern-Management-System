import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { magicLinkRequestSchema } from "@/lib/validators/auth";
import { createAuthToken } from "@/lib/authTokens";
import { sendMagicLoginEmail } from "@/lib/email";

const GENERIC_MESSAGE = "If an account exists for that email, we've sent a sign-in link.";
const LOGIN_TTL_MINUTES = 15;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = magicLinkRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    // Same "don't leak whether the email is registered" behavior as
    // forgot-password — always respond the same way either way.
    if (user) {
      const rawToken = await createAuthToken(user.id, "MAGIC_LOGIN", LOGIN_TTL_MINUTES);
      const loginUrl = `${process.env.APP_URL}/login/verify?token=${rawToken}`;
      try {
        await sendMagicLoginEmail(user.email, loginUrl);
      } catch (emailError) {
        console.error("Failed to send magic login email:", emailError);
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("Magic link request error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
