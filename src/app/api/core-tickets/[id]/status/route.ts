import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { coreTicketActivity, coreTicketStatusHistory, coreTickets } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCoreRole, notifyCoreTicket, requireCoreRole, validTransition } from "@/lib/core-tickets";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    requireCoreRole(session);
    const { id } = await context.params;

    const body = await req.json();
    const { status, reason } = body;
    if (!status) {
      return NextResponse.json({ message: "Status is required" }, { status: 400 });
    }

    const [ticket] = await db
      .select({ id: coreTickets.id, ticketNo: coreTickets.ticketNo, status: coreTickets.status, type: coreTickets.type })
      .from(coreTickets)
      .where(eq(coreTickets.id, id))
      .limit(1);

    if (!ticket) return ok({ message: "Ticket not found" }, 404);

    const ticketType = ticket.type ?? "";
    if (!validTransition(ticket.status, status, ticketType)) {
      return NextResponse.json(
        { message: `Cannot transition from ${ticket.status} to ${status}` },
        { status: 400 },
      );
    }

    const updatedRows = await db
      .update(coreTickets)
      .set({
        status,
        ...(status === "ACCEPTED" && { acceptedAt: new Date() }),
        ...(status === "DEV_IN_PROGRESS" && { devStartedAt: new Date() }),
        ...(status === "READY_FOR_QA" && { readyForQaAt: new Date() }),
        ...(status === "QA_IN_PROGRESS" && { qaStartedAt: new Date() }),
        ...(status === "READY_FOR_PRODUCTION" && { readyForProductionAt: new Date() }),
        ...(status === "REOPENED" && { reopenedAt: new Date() }),
        ...(status === "DONE" && { closedAt: new Date() }),
        ...(status === "CANCELLED" && { closedAt: new Date() }),
        updatedAt: new Date(),
      })
      .where(eq(coreTickets.id, id))
      .returning();

    const updatedTicket = updatedRows[0];
    if (!updatedTicket) return ok({ message: "Update failed" }, 500);

    await db.insert(coreTicketStatusHistory).values({
      coreTicketId: ticket.id,
      actorId: session.id,
      fromStatus: ticket.status,
      toStatus: status,
      reason,
    });

    await db.insert(coreTicketActivity).values({
      coreTicketId: ticket.id,
      actorId: session.id,
      type: "STATUS_CHANGED",
      message: `Status changed from ${ticket.status} to ${status}`,
    });

    await notifyCoreTicket({
      ticketId: ticket.id,
      actorId: session.id,
      title: `Status changed: ${ticket.ticketNo}`,
      message: `Status changed from ${ticket.status} to ${status}`,
    });

    return ok({ ticket: updatedTicket });
  } catch (error) {
    return apiError(error);
  }
}
