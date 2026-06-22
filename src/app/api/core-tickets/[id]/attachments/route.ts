import { eq, or } from "drizzle-orm";
import { coreTicketActivity, coreTicketAttachments, coreTickets } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCoreRole, notifyCoreTicket } from "@/lib/core-tickets";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    if (!isCoreRole(session.role)) throw new Error("FORBIDDEN");
    const { id } = await context.params;

    const [ticket] = await db
      .select({ id: coreTickets.id, ticketNo: coreTickets.ticketNo })
      .from(coreTickets)
      .where(eq(coreTickets.id, id))
      .limit(1);
    if (!ticket) return ok({ message: "Not found" }, 404);

    const body = await req.json();
    const rawLinks = Array.isArray(body.attachments) ? body.attachments : [body];
    const attachments: Array<typeof coreTicketAttachments.$inferSelect> = [];

    for (const item of rawLinks) {
      if (!item?.url?.trim()) continue;
      const rows = await db
        .insert(coreTicketAttachments)
        .values({
          coreTicketId: ticket.id,
          uploadedById: session.id,
          url: item.url,
          publicId: item.url,
          resourceType: "file",
          fileName: item.label || item.url,
          sizeBytes: 0,
        })
        .returning();
      attachments.push(rows[0]);
    }

    if (attachments.length) {
      await db.insert(coreTicketActivity).values({
        coreTicketId: ticket.id,
        actorId: session.id,
        type: "ISSUE_UPDATED",
        message: "Attachment added",
      });
    }

    return ok({ attachments }, 201);
  } catch (error) {
    return apiError(error);
  }
}
