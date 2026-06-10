import { eq, sql } from "drizzle-orm";
import { organizationProjects, organizations, projects } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationProjectLinkSchema } from "@/lib/validators/admin-config";

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

async function findOrganization(id: string) {
  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(organizationLookup(id))
    .limit(1);
  return organization;
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const organization = await findOrganization(id);
    if (!organization) return ok({ message: "Organization not found" }, 404);

    const [linkedProjects, availableProjects] = await Promise.all([
      db
        .select({
          id: projects.id,
          name: projects.name,
          code: projects.code,
          shortCode: projects.shortCode,
          isActive: projects.isActive,
        })
        .from(organizationProjects)
        .innerJoin(projects, eq(organizationProjects.projectId, projects.id))
        .where(eq(organizationProjects.organizationId, organization.id))
        .orderBy(projects.code),
      db
        .select({
          id: projects.id,
          name: projects.name,
          code: projects.code,
          shortCode: projects.shortCode,
          isActive: projects.isActive,
        })
        .from(projects)
        .where(eq(projects.isActive, true))
        .orderBy(projects.code),
    ]);

    return ok({ linkedProjects, availableProjects });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await req.json();
    const parsed = organizationProjectLinkSchema.safeParse(body);
    if (!parsed.success) {
      return ok({ message: parsed.error.issues[0]?.message ?? "Select at least one project" }, 400);
    }

    const organization = await findOrganization(id);
    if (!organization) return ok({ message: "Organization not found" }, 404);

    const values = parsed.data.projectIds.map((projectId) => ({
      organizationId: organization.id,
      projectId,
    }));

    await db
      .insert(organizationProjects)
      .values(values)
      .onConflictDoNothing({
        target: [organizationProjects.organizationId, organizationProjects.projectId],
      });

    return ok({ success: true }, 201);
  } catch (error) {
    return apiError(error);
  }
}
