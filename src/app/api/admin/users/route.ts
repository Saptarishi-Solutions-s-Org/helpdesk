import crypto from "crypto";
import { eq } from "drizzle-orm";
import { organizations, roles, setPasswordTokens, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendSetPasswordMail } from "@/lib/mail/account";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
      .select({
        id: users.id,
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
      .orderBy(users.name);
    return ok({ users: rows });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const token = crypto.randomBytes(32).toString("hex");
    const rows = await db
      .insert(users)
      .values({
        organizationId: body.organizationId || null,
        roleId: body.roleId,
        name: body.name,
        email: String(body.email).toLowerCase(),
        phone: body.phone || null,
        designation: body.designation || null,
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
