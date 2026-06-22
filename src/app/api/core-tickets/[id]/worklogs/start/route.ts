import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { coreTicketActivity, coreTicketWorklogs, coreTickets } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCoreRole, requireCoreRole } from "@/lib/core-tickets";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    requireCoreRole(session);
    const { id } = await context.params;

    const [ticket] = await db
      .select({ id: coreTickets.id, ticketNo: coreTickets.ticketNo, status: coreTickets.status })
      .from(coreTickets)
      .where(eq(coreTickets.id, id))
      .limit(1);

    if (!ticket) return ok({ message: "Ticket not found" }, 404);

    const role = session.role === "QUALITY ANALYST" ? "QUALITY ANALYST" : "DEVELOPER";
    const allowedStatus = role === "QUALITY ANALYST" ? "QA_IN_PROGRESS" : "DEV_IN_PROGRESS";

    if (ticket.status !== allowedStatus) {
      return NextResponse.json(
        { message: `Cannot start worklog when status is ${ticket.status}` },
        { status: 400 },
      );
    }

    const [worklog] = await db
      .insert(coreTicketWorklogs)
      .values({
        coreTicketId: id,
        workerId: session.id,
        workerRole: role,
        startedAt: new Date(),
      })
      .returning();

    await db.insert(coreTicketActivity).values({
      coreTicketId: id,
      actorId: session.id,
      type: "WORKLOG_STARTED",
      message: `${role} started work on ${ticket.ticketNo}`,
    });

    return ok({ worklog }, 201);
  } catch (error) {
    return apiError(error);
  }
}
