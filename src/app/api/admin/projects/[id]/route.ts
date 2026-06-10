import { eq, or, sql } from "drizzle-orm";
import { issues, modules, organizationProjects, projects } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projectSchema } from "@/lib/validators/admin-config";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await req.json();
    const parsed = projectSchema.safeParse(body);

    if (!parsed.success) {
      return ok({ message: parsed.error.issues[0]?.message ?? "Invalid project" }, 400);
    }

    const rows = await db
      .update(projects)
      .set({
        name: parsed.data.name,
        shortCode: parsed.data.shortCode,
        description: parsed.data.description || null,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    if (!rows[0]) return ok({ message: "Project not found" }, 404);
    return ok({ project: rows[0] });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const [association] = await db
      .select({
        moduleCount: sql<number>`count(distinct ${modules.id})::int`,
        issueCount: sql<number>`count(distinct ${issues.id})::int`,
        organizationCount: sql<number>`count(distinct ${organizationProjects.id})::int`,
      })
      .from(projects)
      .leftJoin(modules, eq(modules.projectId, projects.id))
      .leftJoin(organizationProjects, eq(organizationProjects.projectId, projects.id))
      .leftJoin(
        issues,
        or(eq(issues.projectId, projects.id), eq(issues.moduleId, modules.id)),
      )
      .where(eq(projects.id, id));

    if (
      (association?.moduleCount ?? 0) > 0 ||
      (association?.issueCount ?? 0) > 0 ||
      (association?.organizationCount ?? 0) > 0
    ) {
      return ok({ message: "PROJECT_IN_USE" }, 409);
    }

    const rows = await db.delete(projects).where(eq(projects.id, id)).returning();
    if (!rows[0]) return ok({ message: "Project not found" }, 404);
    return ok({ project: rows[0] });
  } catch (error) {
    return apiError(error);
  }
}
