import { organizations } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db.select().from(organizations).orderBy(organizations.name);
    return ok({ organizations: rows });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const rows = await db
      .insert(organizations)
      .values({
        name: body.name,
        slug: body.slug || slugify(body.name),
        code: body.code,
        contactEmail: body.contactEmail || null,
        contactPhone: body.contactPhone || null,
      })
      .returning();
    return ok({ organization: rows[0] }, 201);
  } catch (error) {
    return apiError(error);
  }
}
