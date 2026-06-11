import { and, eq, isNull } from "drizzle-orm";
import { internalTicketActivity, internalTicketWorklogs, internalTickets } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { developerRole, notifyInternalTicket, qaRole } from "@/lib/internal-tickets";

function getLane(ticket: typeof internalTickets.$inferSelect) {
  if (ticket.status === "DEV_IN_PROGRESS") return { role: developerRole, ownerId: ticket.assignedDeveloperId, label: "Developer" };
  if (ticket.status === "QA_IN_PROGRESS") return { role: qaRole, ownerId: ticket.assignedQaId, label: "Quality Analyst" };
  return null;
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const [ticket] = await db.select().from(internalTickets).where(eq(internalTickets.id, id)).limit(1);
    if (!ticket) return ok({ message: "Internal ticket not found" }, 404);
    const lane = getLane(ticket);
    if (!lane) return ok({ message: "Worklog can start only during Dev In Progress or QA In Progress" }, 400);
    if (session.role !== "ADMIN" && (session.role !== lane.role || lane.ownerId !== session.id)) throw new Error("FORBIDDEN");
    if (!lane.ownerId) return ok({ message: `${lane.label} is not assigned` }, 400);

    const [open] = await db
      .select()
      .from(internalTicketWorklogs)
      .where(and(eq(internalTicketWorklogs.internalTicketId, ticket.id), eq(internalTicketWorklogs.workerId, lane.ownerId), eq(internalTicketWorklogs.workerRole, lane.role), isNull(internalTicketWorklogs.stoppedAt)))
      .limit(1);
    if (open) return ok({ message: "A worklog is already running" }, 400);

    const [worklog] = await db.insert(internalTicketWorklogs).values({
      internalTicketId: ticket.id,
      developerId: lane.role === developerRole ? lane.ownerId : null,
      workerId: lane.ownerId,
      workerRole: lane.role,
      startedAt: new Date(),
      note: body.note || null,
    }).returning();
    await db.insert(internalTicketActivity).values({ internalTicketId: ticket.id, actorId: session.id, type: "WORKLOG_STARTED", message: `${session.name} started ${lane.label} worklog`, metadata: { workerId: lane.ownerId, workerRole: lane.role } });
    await notifyInternalTicket({ ticketId: ticket.id, actorId: session.id, title: `${ticket.ticketNo} worklog started`, message: `${lane.label} work timer started.` });
    return ok({ worklog }, 201);
  } catch (error) {
    return apiError(error);
  }
}
