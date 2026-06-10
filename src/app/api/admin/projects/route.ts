import { desc, ilike, or, sql } from "drizzle-orm";
import { projects } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildPaginationMeta,
  getPaginationParams,
} from "@/lib/pagination";
import { projectSchema } from "@/lib/validators/admin-config";

async function nextProjectCode() {
  const [latest] = await db
    .select({ code: projects.code })
    .from(projects)
    .where(ilike(projects.code, "SRSHD%"))
    .orderBy(desc(projects.code))
    .limit(1);
  const lastNumber = Number(latest?.code?.replace(/D/g, "") || "0");
  return `SRSHD${String(lastNumber + 1).padStart(3, "0")}`;
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const hasPagination = url.searchParams.has("page") || url.searchParams.has("limit");
    const search = url.searchParams.get("search")?.trim();
    const where = search
      ? or(
          ilike(projects.name, `%${search}%`),
          ilike(projects.code, `%${search}%`),
          ilike(projects.shortCode, `%${search}%`),
          ilike(projects.description, `%${search}%`),
        )
      : undefined;

    if (!hasPagination) {
      const rows = await db
        .select()
        .from(projects)
        .where(where)
        .orderBy(projects.code);
      return ok({ projects: rows, nextCode: await nextProjectCode() });
    }

    const { page, limit, offset } = getPaginationParams(url.searchParams);
    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(projects)
        .where(where)
        .orderBy(projects.code)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .where(where),
    ]);

    return ok({
      projects: rows,
      nextCode: await nextProjectCode(),
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
    const parsed = projectSchema.safeParse(body);
    if (!parsed.success) {
      return ok({ message: parsed.error.issues[0]?.message ?? "Invalid project" }, 400);
    }

    const rows = await db
      .insert(projects)
      .values({
        name: parsed.data.name,
        code: await nextProjectCode(),
        shortCode: parsed.data.shortCode,
        description: parsed.data.description || null,
      })
      .returning();
    return ok({ project: rows[0] }, 201);
  } catch (error) {
    return apiError(error);
  }
}
