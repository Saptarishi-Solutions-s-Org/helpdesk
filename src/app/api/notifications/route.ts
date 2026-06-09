import { desc, eq } from "drizzle-orm";
import { notifications } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireUser();
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientId, session.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    return ok({
      notifications: rows,
      unreadCount: rows.filter((row) => !row.isRead).length,
    });
  } catch (error) {
    return apiError(error);
  }
}
