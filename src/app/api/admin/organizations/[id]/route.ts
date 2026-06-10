import { eq, sql } from "drizzle-orm";
import { issues, organizations, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationSchema } from "@/lib/validators/admin-config";
import { slugify } from "@/lib/utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const organizationLookup = (id: string) => {
  const value = decodeURIComponent(id).trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(value)
    ? eq(organizations.id, value)
    : sql`lower(${organizations.code}) = ${value.toLowerCase()}`;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const [organization] = await db
      .select()
      .from(organizations)
      .where(organizationLookup(id))
      .limit(1);

    if (!organization) return ok({ message: "Organization not found" }, 404);

    const [stats] = await db
      .select({
        users: sql<number>`count(distinct ${users.id})::int`,
        issues: sql<number>`count(distinct ${issues.id})::int`,
        openIssues: sql<number>`count(distinct ${issues.id}) filter (where ${issues.status} not in ('CLOSED','RESOLVED','CANCELLED'))::int`,
        closedIssues: sql<number>`count(distinct ${issues.id}) filter (where ${issues.status} in ('CLOSED','RESOLVED','CANCELLED'))::int`,
      })
      .from(organizations)
      .leftJoin(users, eq(users.organizationId, organizations.id))
      .leftJoin(issues, eq(issues.organizationId, organizations.id))
      .where(eq(organizations.id, organization.id));

    return ok({ organization, stats });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await req.json();
    const parsed = organizationSchema.safeParse(body);

    if (!parsed.success) {
      return ok({ message: parsed.error.issues[0]?.message ?? "Invalid organization" }, 400);
    }

    const [existing] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(organizationLookup(id))
      .limit(1);

    if (!existing) return ok({ message: "Organization not found" }, 404);

    const rows = await db.transaction(async (tx) => {
      const updated = await tx
        .update(organizations)
        .set({
          name: parsed.data.name,
          slug: slugify(parsed.data.name),
          contactEmail: parsed.data.contactEmail || null,
          contactPhone: parsed.data.contactPhone || null,
          status: parsed.data.status ?? "ACTIVE",
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, existing.id))
        .returning();

      if (parsed.data.status === "INACTIVE") {
        await tx
          .update(users)
          .set({
            status: "INACTIVE",
            sessionVersion: sql`${users.sessionVersion} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(users.organizationId, existing.id));
      }

      return updated;
    });

    if (!rows[0]) return ok({ message: "Organization not found" }, 404);
    return ok({ organization: rows[0] });
  } catch (error) {
    return apiError(error);
  }
}
