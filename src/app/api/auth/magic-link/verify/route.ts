import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { magicLinkVerifySchema } from "@/lib/validators/auth";
import { consumeAuthToken } from "@/lib/authTokens";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = magicLinkVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const consumed = await consumeAuthToken(parsed.data.token, "MAGIC_LOGIN");
    if (!consumed) {
      return NextResponse.json(
        { error: "This sign-in link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: consumed.userId } });
    if (!user) {
      return NextResponse.json({ error: "Account no longer exists" }, { status: 404 });
    }

    const token = signToken({ userId: user.id, role: user.role });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Magic link verify error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
