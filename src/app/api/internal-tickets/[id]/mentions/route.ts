import { eq, inArray } from "drizzle-orm";
import { internalTickets, roles, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { internalRoles, isInternalRole } from "@/lib/internal-tickets";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    if (!isInternalRole(session.role)) throw new Error("FORBIDDEN");
    const { id } = await context.params;
    const [ticket] = await db.select({ id: internalTickets.id }).from(internalTickets).where(eq(internalTickets.id, id)).limit(1);
    if (!ticket) return ok({ mentions: [] });

    const mentionRows = await db
      .select({ id: users.id, name: users.name, email: users.email, roleName: roles.roleName })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(inArray(roles.roleName, [...internalRoles]))
      .orderBy(users.name);

    return ok({ mentions: mentionRows.filter((row) => row.id !== session.id) });
  } catch (error) {
    return apiError(error);
  }
}
