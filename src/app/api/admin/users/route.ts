import crypto from "crypto";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { organizations, roles, setPasswordTokens, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendSetPasswordMail } from "@/lib/mail/account";
import {
  buildPaginationMeta,
  getPaginationParams,
} from "@/lib/pagination";
import { userSchema } from "@/lib/validators/admin-config";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const hasPagination = url.searchParams.has("page") || url.searchParams.has("limit");
    const organizationId = url.searchParams.get("organizationId")?.trim();
    const search = url.searchParams.get("search")?.trim();
    const filters = [
      organizationId ? eq(users.organizationId, organizationId) : undefined,
      search
        ? or(
            ilike(users.name, `%${search}%`),
            ilike(users.email, `%${search}%`),
            ilike(users.phone, `%${search}%`),
            ilike(users.designation, `%${search}%`),
          )
        : undefined,
    ].filter(Boolean);
    const where = filters.length ? and(...filters) : undefined;
    const baseQuery = db
      .select({
        id: users.id,
        organizationId: users.organizationId,
        roleId: users.roleId,
        name: users.name,
        email: users.email,
        phone: users.phone,
        designation: users.designation,
        status: users.status,
        organizationName: organizations.name,
        roleName: roles.roleName,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .where(where)
      .orderBy(users.name);

    if (!hasPagination) {
      const rows = await baseQuery;
      return ok({ users: rows });
    }

    const { page, limit, offset } = getPaginationParams(url.searchParams);
    const [rows, totalRows] = await Promise.all([
      baseQuery.limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(users).where(where),
    ]);

    return ok({
      users: rows,
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
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) {
      return ok({ message: parsed.error.issues[0]?.message ?? "Invalid user" }, 400);
    }
    const [userRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.roleName, "USER"))
      .limit(1);

    if (!userRole) {
      return ok({ message: "USER role is not configured" }, 400);
    }

    const token = crypto.randomBytes(32).toString("hex");
    const rows = await db
      .insert(users)
      .values({
        organizationId: parsed.data.organizationId,
        roleId: userRole.id,
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone || null,
        designation: parsed.data.designation || null,
        password: await hashPassword(crypto.randomBytes(18).toString("hex")),
        mustChangePassword: true,
      })
      .returning();

    await db.insert(setPasswordTokens).values({
      userId: rows[0].id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await sendSetPasswordMail({
      to: rows[0].email,
      name: rows[0].name,
      link: `${process.env.NEXT_PUBLIC_APP_URL}/set-password?token=${token}`,
    });

    return ok({ user: rows[0] }, 201);
  } catch (error) {
    return apiError(error);
  }
}
