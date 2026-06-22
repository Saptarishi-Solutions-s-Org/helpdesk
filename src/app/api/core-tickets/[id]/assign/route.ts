import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { coreTicketActivity, coreTickets } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCoreRole, notifyCoreTicket, requireCoreRole } from "@/lib/core-tickets";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    requireCoreRole(session);
    const { id } = await context.params;

    const body = await req.json();
    const { developerId, qaId, adminId } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (developerId !== undefined) updateData.assignedDeveloperId = developerId || null;
    if (qaId !== undefined) updateData.assignedQaId = qaId || null;
    if (adminId !== undefined) updateData.assignedAdminId = adminId || null;

    const [ticket] = await db
      .update(coreTickets)
      .set(updateData)
      .where(eq(coreTickets.id, id))
      .returning();

    if (!ticket) return ok({ message: "Ticket not found" }, 404);

    await db.insert(coreTicketActivity).values({
      coreTicketId: ticket.id,
      actorId: session.id,
      type: "ASSIGNED",
      message: `Assignees updated for ${ticket.ticketNo}`,
    });

    await notifyCoreTicket({
      ticketId: ticket.id,
      actorId: session.id,
      title: `Assignees updated: ${ticket.ticketNo}`,
      message: `Assignees have been updated`,
    });

    return ok({ ticket });
  } catch (error) {
    return apiError(error);
  }
}
