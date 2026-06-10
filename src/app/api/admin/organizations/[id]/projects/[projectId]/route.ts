import { and, eq, sql } from "drizzle-orm";
import { organizationProjects, organizations } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string; projectId: string }>;
};

const organizationLookup = (id: string) => {
  const value = decodeURIComponent(id).trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(value)
    ? eq(organizations.id, value)
    : sql`lower(${organizations.code}) = ${value.toLowerCase()}`;
};

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id, projectId } = await context.params;
    const [organization] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(organizationLookup(id))
      .limit(1);
    if (!organization) return ok({ message: "Organization not found" }, 404);

    await db
      .delete(organizationProjects)
      .where(
        and(
          eq(organizationProjects.organizationId, organization.id),
          eq(organizationProjects.projectId, projectId),
        ),
      );

    return ok({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
