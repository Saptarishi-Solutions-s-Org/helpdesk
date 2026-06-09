import { eq } from "drizzle-orm";
import { notifications } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH() {
  try {
    const session = await requireUser();
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.recipientId, session.id));
    return ok({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
