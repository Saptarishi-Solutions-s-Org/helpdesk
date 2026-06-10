import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { issues, organizations, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildPaginationMeta,
  getPaginationParams,
} from "@/lib/pagination";
import { organizationSchema } from "@/lib/validators/admin-config";
import { slugify } from "@/lib/utils";

async function nextOrganizationCode() {
  const [latest] = await db
    .select({ code: organizations.code })
    .from(organizations)
    .where(ilike(organizations.code, "SHDORG%"))
    .orderBy(desc(organizations.code))
    .limit(1);
  const lastNumber = Number(latest?.code?.replace(/\D/g, "") || "0");
  return `SHDORG${String(lastNumber + 1).padStart(3, "0")}`;
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const hasPagination = url.searchParams.has("page") || url.searchParams.has("limit");
    const search = url.searchParams.get("search")?.trim();
    const where = search
      ? or(
          ilike(organizations.name, `%${search}%`),
          ilike(organizations.code, `%${search}%`),
          ilike(organizations.contactEmail, `%${search}%`),
          ilike(organizations.contactPhone, `%${search}%`),
        )
      : undefined;

    const selectOrganizations = () =>
      db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          code: organizations.code,
          contactEmail: organizations.contactEmail,
          contactPhone: organizations.contactPhone,
          status: organizations.status,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
          totalUsers: sql<number>`count(distinct ${users.id})::int`,
          totalIssues: sql<number>`count(distinct ${issues.id})::int`,
          openIssues: sql<number>`count(distinct ${issues.id}) filter (where ${issues.status} not in ('CLOSED','RESOLVED','CANCELLED'))::int`,
          closedIssues: sql<number>`count(distinct ${issues.id}) filter (where ${issues.status} in ('CLOSED','RESOLVED','CANCELLED'))::int`,
        })
        .from(organizations)
        .leftJoin(users, eq(users.organizationId, organizations.id))
        .leftJoin(issues, eq(issues.organizationId, organizations.id))
        .where(where)
        .groupBy(organizations.id)
        .orderBy(organizations.code);

    if (!hasPagination) {
      const rows = await selectOrganizations();
      return ok({ organizations: rows, nextCode: await nextOrganizationCode() });
    }

    const { page, limit, offset } = getPaginationParams(url.searchParams);
    const [rows, totalRows] = await Promise.all([
      selectOrganizations().limit(limit).offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizations)
        .where(where),
    ]);

    return ok({
      organizations: rows,
      nextCode: await nextOrganizationCode(),
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
    const parsed = organizationSchema.safeParse(body);
    if (!parsed.success) {
      return ok({ message: parsed.error.issues[0]?.message ?? "Invalid organization" }, 400);
    }

    const rows = await db
      .insert(organizations)
      .values({
        name: parsed.data.name,
        slug: slugify(parsed.data.name),
        code: await nextOrganizationCode(),
        contactEmail: parsed.data.contactEmail || null,
        contactPhone: parsed.data.contactPhone || null,
        status: "ACTIVE",
      })
      .returning();
    return ok({ organization: rows[0] }, 201);
  } catch (error) {
    return apiError(error);
  }
}
