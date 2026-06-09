import crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { passwordResetTokens, users } from "@/db/schema";
import { db } from "@/lib/db";
import { sendForgotPasswordMail } from "@/lib/mail/account";
import { forgotPasswordSchema } from "@/lib/validators/forgot-password";

export async function POST(req: Request) {
  const parsed = forgotPasswordSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || "Invalid request" },
      { status: 400 },
    );
  }
  const { email } = parsed.data;
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!rows.length) {
    return NextResponse.json({ message: "If the email exists, reset link sent" });
  }

  const token = crypto.randomBytes(32).toString("hex");
  await db.insert(passwordResetTokens).values({
    userId: rows[0].id,
    token,
    expiresAt: sql`NOW() + INTERVAL '30 minutes'`,
  });

  await sendForgotPasswordMail({
    to: rows[0].email,
    name: rows[0].name,
    link: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`,
  });

  return NextResponse.json({ success: true });
}
