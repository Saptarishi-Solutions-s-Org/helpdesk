import { and, eq, or } from "drizzle-orm";
import { issues, roles, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const issueLookupFor = (id: string) => {
  const value = decodeURIComponent(id).trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(value)
    ? or(eq(issues.id, value), eq(issues.ticketNo, value))
    : eq(issues.ticketNo, value);
};

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    const issue = (await db.select().from(issues).where(issueLookupFor(id)).limit(1))[0];
    if (!issue) return ok({ mentions: [] });
    if (session.role === "CLIENT" && issue.organizationId !== session.organizationId) throw new Error("FORBIDDEN");

    const mentionRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        roleName: roles.roleName,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(
        and(
          eq(users.status, "ACTIVE"),
          or(eq(users.organizationId, issue.organizationId), eq(roles.roleName, "ADMIN")),
        ),
      )
      .orderBy(users.name);

    return ok({
      mentions: mentionRows.filter((row) => row.id !== session.id),
    });
  } catch (error) {
    return apiError(error);
  }
}
