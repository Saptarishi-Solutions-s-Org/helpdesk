import { and, desc, eq, isNull } from "drizzle-orm";
import { internalTicketActivity, internalTicketStatusHistory, internalTicketWorklogs, internalTickets, roles, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { developerRole, internalStatuses, notifyInternalTicket, qaRole } from "@/lib/internal-tickets";

async function validateQa(userId: string | null | undefined) {
  if (!userId) return null;
  const [row] = await db
    .select({ id: users.id, status: users.status, roleName: roles.roleName })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId))
    .limit(1);
  return row?.status === "ACTIVE" && row.roleName === qaRole ? row.id : null;
}

function canMove(sessionRole: string, sessionId: string, ticket: typeof internalTickets.$inferSelect, nextStatus: string) {
  if (sessionRole === "ADMIN") return true;
  if (sessionRole === developerRole) {
    return ticket.assignedDeveloperId === sessionId && ["NEW", "ACCEPTED", "DEV_IN_PROGRESS", "DEV_REVIEW", "READY_FOR_QA", "REOPENED"].includes(nextStatus);
  }
  if (sessionRole === qaRole) {
    return ticket.assignedQaId === sessionId && ["READY_FOR_QA", "QA_IN_PROGRESS", "READY_FOR_PRODUCTION", "REOPENED"].includes(nextStatus);
  }
  return false;
}

function validTransition(from: string, to: string) {
  const allowed: Record<string, string[]> = {
    NEW: ["ACCEPTED"],
    REOPENED: ["ACCEPTED"],
    ACCEPTED: ["DEV_IN_PROGRESS"],
    DEV_IN_PROGRESS: ["DEV_REVIEW", "READY_FOR_QA"],
    DEV_REVIEW: ["READY_FOR_QA", "DEV_IN_PROGRESS"],
    READY_FOR_QA: ["QA_IN_PROGRESS"],
    QA_IN_PROGRESS: ["READY_FOR_PRODUCTION", "REOPENED"],
  };
  return allowed[from]?.includes(to) ?? false;
}

function isBackwardMove(from: string, to: string) {
  const rank: Record<string, number> = {
    NEW: 1,
    ACCEPTED: 2,
    DEV_IN_PROGRESS: 3,
    DEV_REVIEW: 4,
    READY_FOR_QA: 5,
    QA_IN_PROGRESS: 6,
    READY_FOR_PRODUCTION: 7,
    REOPENED: 2,
  };
  return (rank[to] ?? 0) < (rank[from] ?? 0);
}

type WorklogTx = Pick<typeof db, "select" | "update" | "insert">;

async function stopOpenWorklogsForLane(tx: WorklogTx, ticketId: string, ownerRole: string, actorId: string, reason: string, now: Date) {
  const openRows = await tx
    .select()
    .from(internalTicketWorklogs)
    .where(
      and(
        eq(internalTicketWorklogs.internalTicketId, ticketId),
        eq(internalTicketWorklogs.workerRole, ownerRole),
        isNull(internalTicketWorklogs.stoppedAt),
      ),
    )
    .orderBy(desc(internalTicketWorklogs.startedAt));

  for (const openWorklog of openRows) {
    const durationMinutes = Math.max(1, Math.ceil((now.getTime() - openWorklog.startedAt.getTime()) / 60000));
    await tx
      .update(internalTicketWorklogs)
      .set({ stoppedAt: now, durationMinutes, stopReason: reason })
      .where(eq(internalTicketWorklogs.id, openWorklog.id));
    await tx.insert(internalTicketActivity).values({
      internalTicketId: ticketId,
      actorId,
      type: "WORKLOG_AUTO_STOPPED",
      message: `${ownerRole} worklog auto-stopped: ${reason}`,
      metadata: { workerId: openWorklog.workerId || openWorklog.developerId, workerRole: ownerRole, durationMinutes, reason },
    });
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    const body = await req.json();
    const nextStatus = body.status;
    if (!internalStatuses.includes(nextStatus)) return ok({ message: "Select a valid internal status" }, 400);

    const [current] = await db.select().from(internalTickets).where(eq(internalTickets.id, id)).limit(1);
    if (!current) return ok({ message: "Internal ticket not found" }, 404);
    if (!canMove(session.role, session.id, current, nextStatus)) throw new Error("FORBIDDEN");
    const forcedMove = !validTransition(current.status, nextStatus);
    const backwardMove = isBackwardMove(current.status, nextStatus);
    if (forcedMove && !["ADMIN", developerRole, qaRole].includes(session.role)) return ok({ message: "This status movement is not allowed" }, 400);

    let assignedQaId = current.assignedQaId;
    if (nextStatus === "READY_FOR_QA") {
      assignedQaId = body.qaId || current.assignedQaId;
      const validQaId = await validateQa(assignedQaId);
      if (!validQaId) return ok({ message: "Select a Quality Analyst before moving to Ready for QA" }, 400);
      assignedQaId = validQaId;
    }

    const now = new Date();
    const update: Partial<typeof internalTickets.$inferInsert> = { status: nextStatus, assignedQaId, updatedAt: now };
    if (nextStatus === "ACCEPTED") update.acceptedAt = now;
    if (nextStatus === "DEV_IN_PROGRESS") update.devStartedAt = now;
    if (nextStatus === "READY_FOR_QA") update.readyForQaAt = now;
    if (nextStatus === "QA_IN_PROGRESS") update.qaStartedAt = now;
    if (nextStatus === "READY_FOR_PRODUCTION") update.readyForProductionAt = now;
    if (nextStatus === "REOPENED") {
      update.reopenedAt = now;
      update.assignedDeveloperId = current.previousDeveloperId || current.assignedDeveloperId;
    }

    const stopDevWorklog = current.status === "DEV_IN_PROGRESS" && nextStatus !== "DEV_IN_PROGRESS";
    const stopQaWorklog = current.status === "QA_IN_PROGRESS" && nextStatus !== "QA_IN_PROGRESS";
    const reason = body.reason || `Status moved from ${current.status} to ${nextStatus}`;

    const [updated] = await db.transaction(async (tx) => {
      const [row] = await tx.update(internalTickets).set(update).where(eq(internalTickets.id, current.id)).returning();
      await tx.insert(internalTicketStatusHistory).values({
        internalTicketId: current.id,
        actorId: session.id,
        fromStatus: current.status,
        toStatus: nextStatus,
        reason: body.reason || null,
      });
      await tx.insert(internalTicketActivity).values({
        internalTicketId: current.id,
        actorId: session.id,
        type: "STATUS_CHANGED",
        message: `${session.name} moved status from ${current.status} to ${nextStatus}`,
        metadata: { from: current.status, to: nextStatus, reason: body.reason || null, forcedMove, backwardMove },
      });
      if (stopDevWorklog) await stopOpenWorklogsForLane(tx, current.id, developerRole, session.id, reason, now);
      if (stopQaWorklog) await stopOpenWorklogsForLane(tx, current.id, qaRole, session.id, reason, now);
      return [row];
    });

    await notifyInternalTicket({
      ticketId: current.id,
      actorId: session.id,
      title: `${current.ticketNo} moved to ${nextStatus}`,
      message: body.reason || "Internal ticket status changed.",
    });

    return ok({ ticket: updated });
  } catch (error) {
    return apiError(error);
  }
}


