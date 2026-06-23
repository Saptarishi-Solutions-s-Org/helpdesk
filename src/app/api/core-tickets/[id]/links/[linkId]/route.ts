import { eq } from "drizzle-orm";
import { coreTicketActivity, coreTicketLinks, coreTickets } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCoreRole } from "@/lib/core-tickets";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string; linkId: string }> },
) {
  try {
    const session = await requireUser();
    if (!isCoreRole(session.role)) throw new Error("FORBIDDEN");
    const { id, linkId } = await context.params;

    const [link] = await db
      .select()
      .from(coreTicketLinks)
      .where(eq(coreTicketLinks.id, linkId))
      .limit(1);

    if (!link) return ok({ message: "Link not found" }, 404);
    if (link.sourceTicketId !== id && link.targetTicketId !== id) {
      return ok({ message: "Link not found" }, 404);
    }

    await db.delete(coreTicketLinks).where(eq(coreTicketLinks.id, linkId));

    await db.insert(coreTicketActivity).values({
      coreTicketId: id,
      actorId: session.id,
      type: "LINK_REMOVED",
      message: "Link removed",
    });

    return ok({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
