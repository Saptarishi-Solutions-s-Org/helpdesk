import { and, eq } from "drizzle-orm";
import { coreTicketComments } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCoreRole, requireCoreRole } from "@/lib/core-tickets";

export async function DELETE(_req: Request, context: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const session = await requireUser();
    requireCoreRole(session);
    const { id, commentId } = await context.params;

    const [comment] = await db
      .delete(coreTicketComments)
      .where(and(eq(coreTicketComments.id, commentId), eq(coreTicketComments.coreTicketId, id)))
      .returning();

    if (!comment) return ok({ message: "Comment not found" }, 404);

    return ok({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
