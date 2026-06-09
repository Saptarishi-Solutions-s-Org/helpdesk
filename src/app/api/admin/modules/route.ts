import { modules, projects } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
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
      .orderBy(projects.name, modules.name);
    return ok({ modules: rows });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const rows = await db
      .insert(modules)
      .values({
        projectId: body.projectId,
        name: body.name,
        code: body.code,
        description: body.description,
      })
      .returning();
    return ok({ module: rows[0] }, 201);
  } catch (error) {
    return apiError(error);
  }
}
