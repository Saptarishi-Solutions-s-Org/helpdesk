import { and, eq, ne, sql } from "drizzle-orm";
import { roles, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { internalUserUpdateSchema } from "@/lib/validators/admin-config";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await req.json();
    const parsed = internalUserUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return ok({ message: parsed.error.issues[0]?.message ?? "Invalid user" }, 400);
    }

    const [existing] = await db
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing) return ok({ message: "User not found" }, 404);

    const [duplicateEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, parsed.data.email.toLowerCase()), ne(users.id, id)))
      .limit(1);

    if (duplicateEmail) return ok({ message: "Email is already used by another user" }, 400);

    const [updated] = await db
      .update(users)
      .set({
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone || null,
        designation: parsed.data.designation || null,
        status: parsed.data.status,
        ...(parsed.data.status === "INACTIVE" && existing.status !== "INACTIVE"
          ? { sessionVersion: sql`${users.sessionVersion} + 1` }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return ok({ user: updated });
  } catch (error) {
    return apiError(error);
  }
}
