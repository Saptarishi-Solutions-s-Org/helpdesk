import { eq } from "drizzle-orm";
import { coreTicketActivity, coreTicketAttachments, coreTickets } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCoreRole } from "@/lib/core-tickets";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> },
) {
  try {
    const session = await requireUser();
    if (!isCoreRole(session.role)) throw new Error("FORBIDDEN");
    const { id, attachmentId } = await context.params;

    const [ticket] = await db
      .select({ id: coreTickets.id, ticketNo: coreTickets.ticketNo })
      .from(coreTickets)
      .where(eq(coreTickets.id, id))
      .limit(1);
    if (!ticket) return ok({ message: "Not found" }, 404);

    const [attachment] = await db
      .select()
      .from(coreTicketAttachments)
      .where(eq(coreTicketAttachments.id, attachmentId))
      .limit(1);
    if (!attachment || attachment.coreTicketId !== ticket.id) {
      return ok({ message: "Attachment not found" }, 404);
    }

    await db.delete(coreTicketAttachments).where(eq(coreTicketAttachments.id, attachmentId));

    await db.insert(coreTicketActivity).values({
      coreTicketId: ticket.id,
      actorId: session.id,
      type: "ISSUE_UPDATED",
      message: "Attachment removed",
    });

    return ok({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
