import { eq, sql } from "drizzle-orm";
import { issues, modules, projects } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { moduleSchema } from "@/lib/validators/admin-config";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await req.json();
    const parsed = moduleSchema.safeParse(body);

    if (!parsed.success) {
      return ok({ message: parsed.error.issues[0]?.message ?? "Invalid module" }, 400);
    }

    const rows = await db
      .update(modules)
      .set({
        projectId: parsed.data.projectId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        updatedAt: new Date(),
      })
      .where(eq(modules.id, id))
      .returning();

    if (!rows[0]) return ok({ message: "Module not found" }, 404);

    const [row] = await db
      .select({
        id: modules.id,
        projectId: modules.projectId,
        projectName: projects.name,
        name: modules.name,
        code: modules.code,
        description: modules.description,
        isActive: modules.isActive,
      })
      .from(modules)
      .leftJoin(projects, eq(modules.projectId, projects.id))
      .where(eq(modules.id, id));

    return ok({ module: row });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const [association] = await db
      .select({ issueCount: sql<number>`count(*)::int` })
      .from(issues)
      .where(eq(issues.moduleId, id));

    if ((association?.issueCount ?? 0) > 0) {
      return ok({ message: "MODULE_IN_USE" }, 409);
    }

    const rows = await db.delete(modules).where(eq(modules.id, id)).returning();
    if (!rows[0]) return ok({ message: "Module not found" }, 404);
    return ok({ module: rows[0] });
  } catch (error) {
    return apiError(error);
  }
}
