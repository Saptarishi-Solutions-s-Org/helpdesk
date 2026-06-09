import { and, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { setPasswordTokens, users } from "@/db/schema";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validators/reset-password";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = resetPasswordSchema.safeParse({
    password: body.password,
    confirmPassword: body.confirmPassword ?? body.password,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Invalid password" },
      { status: 400 },
    );
  }

  const { token } = body;
  const { password } = parsed.data;
  const rows = await db
    .select()
    .from(setPasswordTokens)
    .where(
      and(
        eq(setPasswordTokens.token, String(token || "")),
        eq(setPasswordTokens.isUsed, false),
        gt(setPasswordTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const setup = rows[0];
  if (!setup) return NextResponse.json({ message: "Invalid token" }, { status: 400 });

  await db
    .update(users)
    .set({ password: await hashPassword(String(password)), mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.id, setup.userId));
  await db
    .update(setPasswordTokens)
    .set({ isUsed: true })
    .where(eq(setPasswordTokens.id, setup.id));

  return NextResponse.json({ success: true });
}
