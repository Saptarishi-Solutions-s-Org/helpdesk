import { and, eq } from "drizzle-orm";
import { internalTicketActivity, internalTicketComments, internalTickets } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isInternalRole, notifyInternalTicket } from "@/lib/internal-tickets";

export async function DELETE(_req: Request, context: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const session = await requireUser();
    if (!isInternalRole(session.role)) throw new Error("FORBIDDEN");
    const { id, commentId } = await context.params;

    const [ticket] = await db.select().from(internalTickets).where(eq(internalTickets.id, id)).limit(1);
    if (!ticket) return ok({ message: "Internal ticket not found" }, 404);

    const [comment] = await db.select().from(internalTicketComments).where(and(eq(internalTicketComments.id, commentId), eq(internalTicketComments.internalTicketId, ticket.id))).limit(1);
    if (!comment) return ok({ message: "Comment not found" }, 404);
    if (session.role !== "ADMIN" && comment.authorId !== session.id) throw new Error("FORBIDDEN");

    await db.delete(internalTicketComments).where(eq(internalTicketComments.id, comment.id));
    await db.insert(internalTicketActivity).values({
      internalTicketId: ticket.id,
      actorId: session.id,
      type: "COMMENT_DELETED",
      message: `${session.name} deleted an internal comment`,
      metadata: { commentId: comment.id },
    });
    await notifyInternalTicket({ ticketId: ticket.id, actorId: session.id, title: `${ticket.ticketNo} comment deleted`, message: `${session.name} deleted an internal comment.` });

    return ok({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
