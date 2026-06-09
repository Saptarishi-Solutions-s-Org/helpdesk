import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { modules, projects } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildPaginationMeta,
  getPaginationParams,
} from "@/lib/pagination";
import { moduleSchema } from "@/lib/validators/admin-config";

async function nextModuleCode() {
  const [latest] = await db
    .select({ code: modules.code })
    .from(modules)
    .where(ilike(modules.code, "SRSHDM%"))
    .orderBy(desc(modules.code))
    .limit(1);
  const lastNumber = Number(latest?.code?.replace(/\D/g, "") || "0");
  return `SRSHDM${String(lastNumber + 1).padStart(3, "0")}`;
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const hasPagination = url.searchParams.has("page") || url.searchParams.has("limit");
    const search = url.searchParams.get("search")?.trim();
    const projectId = url.searchParams.get("projectId")?.trim();
    const filters = [
      projectId ? eq(modules.projectId, projectId) : undefined,
      search
        ? or(
            ilike(modules.name, `%${search}%`),
            ilike(modules.code, `%${search}%`),
            ilike(modules.description, `%${search}%`),
            ilike(projects.name, `%${search}%`),
          )
        : undefined,
    ].filter(Boolean);
    const where = filters.length ? and(...filters) : undefined;

    const query = db
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
      .where(where)
      .orderBy(projects.code, modules.code);

    if (!hasPagination) {
      const rows = await query;
      return ok({ modules: rows, nextCode: await nextModuleCode() });
    }

    const { page, limit, offset } = getPaginationParams(url.searchParams);
    const [rows, totalRows] = await Promise.all([
      query.limit(limit).offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(modules)
        .leftJoin(projects, eq(modules.projectId, projects.id))
        .where(where),
    ]);

    return ok({
      modules: rows,
      nextCode: await nextModuleCode(),
      pagination: buildPaginationMeta(page, limit, totalRows[0]?.count ?? 0),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = moduleSchema.safeParse(body);
    if (!parsed.success) {
      return ok({ message: parsed.error.issues[0]?.message ?? "Invalid module" }, 400);
    }

    const rows = await db
      .insert(modules)
      .values({
        projectId: parsed.data.projectId,
        name: parsed.data.name,
        code: await nextModuleCode(),
        description: parsed.data.description || null,
      })
      .returning();
    return ok({ module: rows[0] }, 201);
  } catch (error) {
    return apiError(error);
  }
}
