import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { resetPasswordSchema } from "@/lib/validators/auth";
import { consumeAuthToken } from "@/lib/authTokens";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;
    const consumed = await consumeAuthToken(token, "PASSWORD_RESET");
    if (!consumed) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: consumed.userId },
      data: { passwordHash },
    });

    return NextResponse.json({ message: "Password updated. You can now sign in." });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
