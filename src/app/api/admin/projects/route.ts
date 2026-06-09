import { projects } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db.select().from(projects).orderBy(projects.name);
    return ok({ projects: rows });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const rows = await db
      .insert(projects)
      .values({ name: body.name, code: body.code, description: body.description })
      .returning();
    return ok({ project: rows[0] }, 201);
  } catch (error) {
    return apiError(error);
  }
}
