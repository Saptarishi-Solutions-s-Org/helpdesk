import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { users } from "@/db/schema";
import { apiError } from "@/lib/api";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordSchema } from "@/lib/validators/password";

export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const parsed = passwordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || "Invalid password" },
        { status: 400 },
      );
    }
    const { currentPassword, newPassword } = parsed.data;
    const rows = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
    if (!rows[0] || !(await verifyPassword(String(currentPassword), rows[0].password))) {
      return NextResponse.json({ message: "Current password is incorrect" }, { status: 400 });
    }
    await db
      .update(users)
      .set({ password: await hashPassword(String(newPassword)), updatedAt: new Date() })
      .where(eq(users.id, session.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
