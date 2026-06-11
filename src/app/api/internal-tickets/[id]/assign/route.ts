import { and, eq, inArray, isNull } from "drizzle-orm";
import { internalTicketActivity, internalTicketWorklogs, internalTickets, notifications, roles, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { developerRole, isInternalRole, notifyInternalTicket, qaRole } from "@/lib/internal-tickets";

const adminRole = "ADMIN";

async function validateUserRole(userId: string | null | undefined, roleName: string) {
  if (!userId) return null;
  const [row] = await db
    .select({ id: users.id, name: users.name, status: users.status, roleName: roles.roleName })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId))
    .limit(1);
  if (!row || row.status !== "ACTIVE" || row.roleName !== roleName) return null;
  return row;
}

async function getUserNames(ids: Array<string | null | undefined>) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (!uniqueIds.length) return new Map<string, string>();
  const rows = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, uniqueIds));
  return new Map(rows.map((row) => [row.id, row.name]));
}

function canAssign(sessionId: string, sessionRole: string, ticket: typeof internalTickets.$inferSelect) {
  if (sessionRole === "ADMIN") return true;
  if (sessionRole === developerRole && ticket.assignedDeveloperId === sessionId) return true;
  if (sessionRole === qaRole && ticket.assignedQaId === sessionId) return true;
  return false;
}

async function stopOpenWorklogForOwner({
  ticketId,
  ownerId,
  ownerRole,
  actorId,
  reason,
}: {
  ticketId: string;
  ownerId: string | null;
  ownerRole: string;
  actorId: string;
  reason: string;
}) {
  if (!ownerId) return null;
  const [openWorklog] = await db
    .select()
    .from(internalTicketWorklogs)
    .where(
      and(
        eq(internalTicketWorklogs.internalTicketId, ticketId),
        eq(internalTicketWorklogs.workerId, ownerId),
        eq(internalTicketWorklogs.workerRole, ownerRole),
        isNull(internalTicketWorklogs.stoppedAt),
      ),
    )
    .limit(1);
  if (!openWorklog) return null;

  const now = new Date();
  const durationMinutes = Math.max(1, Math.ceil((now.getTime() - openWorklog.startedAt.getTime()) / 60000));
  const [worklog] = await db
    .update(internalTicketWorklogs)
    .set({ stoppedAt: now, durationMinutes, stopReason: reason })
    .where(eq(internalTicketWorklogs.id, openWorklog.id))
    .returning();
  await db.insert(internalTicketActivity).values({
    internalTicketId: ticketId,
    actorId,
    type: "WORKLOG_AUTO_STOPPED",
    message: `${ownerRole} worklog auto-stopped: ${reason}`,
    metadata: { workerId: ownerId, workerRole: ownerRole, durationMinutes, reason },
  });
  return worklog;
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    if (!isInternalRole(session.role)) throw new Error("FORBIDDEN");
    const { id } = await context.params;
    const body = await req.json();

    const [current] = await db.select().from(internalTickets).where(eq(internalTickets.id, id)).limit(1);
    if (!current) return ok({ message: "Internal ticket not found" }, 404);
    if (!canAssign(session.id, session.role, current)) throw new Error("FORBIDDEN");

    const developerId = body.developerId === "" ? null : body.developerId;
    const qaId = body.qaId === "" ? null : body.qaId;
    const adminId = session.role === "ADMIN" ? (body.adminId === "" ? null : body.adminId) : undefined;

    const validDeveloper = developerId === undefined ? null : await validateUserRole(developerId, developerRole);
    const validQa = qaId === undefined ? null : await validateUserRole(qaId, qaRole);
    const validAdmin = adminId === undefined ? null : await validateUserRole(adminId, adminRole);

    if (developerId && !validDeveloper) return ok({ message: "Select an active Developer" }, 400);
    if (qaId && !validQa) return ok({ message: "Select an active Quality Analyst" }, 400);
    if (adminId && !validAdmin) return ok({ message: "Select an active Admin" }, 400);

    const nextDeveloperId = developerId === undefined ? current.assignedDeveloperId : validDeveloper?.id ?? null;
    const nextQaId = qaId === undefined ? current.assignedQaId : validQa?.id ?? null;
    const nextAdminId = adminId === undefined ? current.assignedAdminId : validAdmin?.id ?? null;

    const changedDeveloper = nextDeveloperId !== current.assignedDeveloperId;
    const changedQa = nextQaId !== current.assignedQaId;
    const changedAdmin = nextAdminId !== current.assignedAdminId;
    if (!changedDeveloper && !changedQa && !changedAdmin) return ok({ ticket: current });

    const names = await getUserNames([
      current.assignedDeveloperId,
      nextDeveloperId,
      current.assignedQaId,
      nextQaId,
      current.assignedAdminId,
      nextAdminId,
    ]);
    const changes = [
      changedDeveloper ? { field: "Developer", fromId: current.assignedDeveloperId, toId: nextDeveloperId, from: current.assignedDeveloperId ? names.get(current.assignedDeveloperId) : "Not assigned", to: nextDeveloperId ? names.get(nextDeveloperId) : "Not assigned" } : null,
      changedQa ? { field: "Quality Analyst", fromId: current.assignedQaId, toId: nextQaId, from: current.assignedQaId ? names.get(current.assignedQaId) : "Not assigned", to: nextQaId ? names.get(nextQaId) : "Not assigned" } : null,
      changedAdmin ? { field: "Admin Owner", fromId: current.assignedAdminId, toId: nextAdminId, from: current.assignedAdminId ? names.get(current.assignedAdminId) : "Not assigned", to: nextAdminId ? names.get(nextAdminId) : "Not assigned" } : null,
    ].filter(Boolean);

    const [updated] = await db
      .update(internalTickets)
      .set({
        assignedDeveloperId: nextDeveloperId,
        previousDeveloperId: nextDeveloperId || current.previousDeveloperId,
        assignedQaId: nextQaId,
        assignedAdminId: nextAdminId,
        updatedAt: new Date(),
      })
      .where(eq(internalTickets.id, current.id))
      .returning();

    if (changedDeveloper) {
      await stopOpenWorklogForOwner({ ticketId: current.id, ownerId: current.assignedDeveloperId, ownerRole: developerRole, actorId: session.id, reason: "Developer reassigned" });
    }
    if (changedQa) {
      await stopOpenWorklogForOwner({ ticketId: current.id, ownerId: current.assignedQaId, ownerRole: qaRole, actorId: session.id, reason: "Quality Analyst reassigned" });
    }

    await db.insert(internalTicketActivity).values({
      internalTicketId: current.id,
      actorId: session.id,
      type: "ASSIGNMENT_UPDATED",
      message: `${session.name} updated internal assignment`,
      metadata: { changes },
    });

    const notifyIds = new Set<string>();
    for (const change of changes) {
      if (change?.fromId) notifyIds.add(change.fromId);
      if (change?.toId) notifyIds.add(change.toId);
    }
    notifyIds.delete(session.id);
    if (notifyIds.size) {
      await db.insert(notifications).values(Array.from(notifyIds).map((recipientId) => ({
        recipientId,
        issueId: null,
        type: "ISSUE_ASSIGNED" as const,
        title: `${current.ticketNo} assignment updated`,
        message: changes.map((change) => `${change?.field}: ${change?.from} to ${change?.to}`).join("; "),
        link: `/dashboard/internal-tickets/${current.ticketNo}`,
      })));
    }
    await notifyInternalTicket({ ticketId: current.id, actorId: session.id, title: `${current.ticketNo} assignment updated`, message: "Internal ticket assignment was updated." });

    return ok({ ticket: updated });
  } catch (error) {
    return apiError(error);
  }
}
