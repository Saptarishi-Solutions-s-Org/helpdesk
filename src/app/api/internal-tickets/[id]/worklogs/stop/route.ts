import { and, desc, eq, isNull } from "drizzle-orm";
import { internalTicketActivity, internalTicketWorklogs, internalTickets } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { developerRole, notifyInternalTicket, qaRole } from "@/lib/internal-tickets";

function currentOwnerFilter(ticket: typeof internalTickets.$inferSelect, sessionId: string, sessionRole: string) {
  if (sessionRole === "ADMIN") return null;
  if (sessionRole === developerRole && ticket.assignedDeveloperId === sessionId) return { ownerId: sessionId, role: developerRole };
  if (sessionRole === qaRole && ticket.assignedQaId === sessionId) return { ownerId: sessionId, role: qaRole };
  return false;
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const [ticket] = await db.select().from(internalTickets).where(eq(internalTickets.id, id)).limit(1);
    if (!ticket) return ok({ message: "Internal ticket not found" }, 404);
    const owner = currentOwnerFilter(ticket, session.id, session.role);
    if (owner === false) throw new Error("FORBIDDEN");

    const filters = [eq(internalTicketWorklogs.internalTicketId, ticket.id), isNull(internalTicketWorklogs.stoppedAt)];
    if (owner) {
      filters.push(eq(internalTicketWorklogs.workerId, owner.ownerId));
      filters.push(eq(internalTicketWorklogs.workerRole, owner.role));
    }
    const [open] = await db.select().from(internalTicketWorklogs).where(and(...filters)).orderBy(desc(internalTicketWorklogs.startedAt)).limit(1);
    if (!open) return ok({ message: "No running worklog found" }, 400);

    const now = new Date();
    const durationMinutes = Math.max(1, Math.ceil((now.getTime() - open.startedAt.getTime()) / 60000));
    const [worklog] = await db.update(internalTicketWorklogs).set({ stoppedAt: now, durationMinutes, note: body.note || open.note || null, stopReason: body.reason || "Stopped manually" }).where(eq(internalTicketWorklogs.id, open.id)).returning();
    await db.insert(internalTicketActivity).values({ internalTicketId: ticket.id, actorId: session.id, type: "WORKLOG_STOPPED", message: `${session.name} stopped ${open.workerRole} worklog`, metadata: { durationMinutes, workerId: open.workerId || open.developerId, workerRole: open.workerRole, reason: body.reason || "Stopped manually" } });
    await notifyInternalTicket({ ticketId: ticket.id, actorId: session.id, title: `${ticket.ticketNo} worklog stopped`, message: `${durationMinutes} minute(s) logged.` });
    return ok({ worklog });
  } catch (error) {
    return apiError(error);
  }
}
