import { roles } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db.select().from(roles).orderBy(roles.roleName);
    return ok({ roles: rows });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const rows = await db
      .insert(roles)
      .values({ roleName: body.roleName, description: body.description })
      .returning();
    return ok({ role: rows[0] }, 201);
  } catch (error) {
    return apiError(error);
  }
}
