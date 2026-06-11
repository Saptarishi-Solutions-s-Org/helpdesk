import crypto from "crypto";
import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { roles, setPasswordTokens, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendSetPasswordMail } from "@/lib/mail/account";
import { buildPaginationMeta, getPaginationParams } from "@/lib/pagination";
import { internalUserSchema } from "@/lib/validators/admin-config";

const internalRoles = ["DEVELOPER", "QUALITY ANALYST"] as const;

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim();
    const { page, limit, offset } = getPaginationParams(url.searchParams);
    const filters = [
      inArray(roles.roleName, [...internalRoles]),
      search
        ? or(
            ilike(users.name, `%${search}%`),
            ilike(users.email, `%${search}%`),
            ilike(users.phone, `%${search}%`),
            ilike(users.designation, `%${search}%`),
            ilike(roles.roleName, `%${search}%`),
          )
        : undefined,
    ].filter(Boolean);
    const where = and(...filters);

    const baseQuery = db
      .select({
        id: users.id,
        roleId: users.roleId,
        name: users.name,
        email: users.email,
        phone: users.phone,
        designation: users.designation,
        status: users.status,
        roleName: roles.roleName,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(where)
      .orderBy(users.name);

    const [rows, totalRows] = await Promise.all([
      baseQuery.limit(limit).offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(where),
    ]);

    return ok({ users: rows, pagination: buildPaginationMeta(page, limit, totalRows[0]?.count ?? 0) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = internalUserSchema.safeParse(body);
    if (!parsed.success) {
      return ok({ message: parsed.error.issues[0]?.message ?? "Invalid internal user" }, 400);
    }

    const [[role], [duplicateEmail]] = await Promise.all([
      db.select({ id: roles.id }).from(roles).where(eq(roles.roleName, parsed.data.roleName)).limit(1),
      db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email.toLowerCase())).limit(1),
    ]);

    if (!role) return ok({ message: `${parsed.data.roleName} role is not configured` }, 400);
    if (duplicateEmail) return ok({ message: "Email is already used by another user" }, 400);

    const token = crypto.randomBytes(32).toString("hex");
    const rows = await db
      .insert(users)
      .values({
        organizationId: null,
        roleId: role.id,
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
