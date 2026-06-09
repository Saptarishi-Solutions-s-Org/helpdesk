import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireUser();
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        designation: users.designation,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, session.id))
      .limit(1);
    return ok({ profile: rows[0] });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireUser();
    const body = await req.json();
    await db
      .update(users)
      .set({
        name: body.name,
        phone: body.phone,
        designation: body.designation,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.id));
    return ok({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
