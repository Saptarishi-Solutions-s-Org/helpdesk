import { and, eq, inArray, sql } from "drizzle-orm";
import { internalTickets, notifications, roles, ticketSequences, users } from "@/db/schema";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import type { db as drizzleDb } from "@/lib/db";

export const INTERNAL_TICKET_SEGMENT = "SIT";
export const internalRoles = ["ADMIN", "DEVELOPER", "QUALITY ANALYST"] as const;
export const developerRole = "DEVELOPER";
export const qaRole = "QUALITY ANALYST";

export const internalStatuses = [
  "NEW",
  "ACCEPTED",
  "DEV_IN_PROGRESS",
  "DEV_REVIEW",
  "READY_FOR_QA",
  "QA_IN_PROGRESS",
  "READY_FOR_PRODUCTION",
  "REOPENED",
] as const;

export const openInternalStatuses = [
  "NEW",
  "ACCEPTED",
  "DEV_IN_PROGRESS",
  "DEV_REVIEW",
  "READY_FOR_QA",
  "QA_IN_PROGRESS",
  "REOPENED",
] as const;

type TicketSequenceTx = Pick<typeof drizzleDb, "insert">;

export function isInternalRole(role: string) {
  return internalRoles.includes(role as (typeof internalRoles)[number]);
}

export function requireInternalRole(session: SessionUser) {
  if (!isInternalRole(session.role)) throw new Error("FORBIDDEN");
}

export function buildInternalTicketNo(orgShortCode: string, number: number) {
  return `SIT-${orgShortCode.toUpperCase()}-${number}`;
}

export async function nextInternalTicketNo(
  tx: TicketSequenceTx,
  scope: { organizationId: string; orgShortCode: string },
) {
  const [sequence] = await tx
    .insert(ticketSequences)
    .values({
      organizationId: scope.organizationId,
      projectId: null,
      projectSegment: INTERNAL_TICKET_SEGMENT,
      lastNumber: 1,
    })
    .onConflictDoUpdate({
      target: [ticketSequences.organizationId, ticketSequences.projectSegment],
      set: {
        lastNumber: sql`${ticketSequences.lastNumber} + 1`,
        projectId: null,
        updatedAt: new Date(),
      },
    })
    .returning({ lastNumber: ticketSequences.lastNumber });

  return buildInternalTicketNo(scope.orgShortCode, sequence.lastNumber);
}

export async function getInternalAssigneeRecipients(ticketId: string, actorId?: string) {
  const [ticket] = await db
    .select({
      id: internalTickets.id,
      assignedDeveloperId: internalTickets.assignedDeveloperId,
      assignedQaId: internalTickets.assignedQaId,
      assignedAdminId: internalTickets.assignedAdminId,
      ticketNo: internalTickets.ticketNo,
    })
    .from(internalTickets)
    .where(eq(internalTickets.id, ticketId))
    .limit(1);
  if (!ticket) return { ticket: null, recipients: [] as string[] };

  const adminRows = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.status, "ACTIVE"), eq(roles.roleName, "ADMIN")));

  const recipients = new Set<string>();
  for (const row of adminRows) recipients.add(row.id);
  if (ticket.assignedDeveloperId) recipients.add(ticket.assignedDeveloperId);
  if (ticket.assignedQaId) recipients.add(ticket.assignedQaId);
  if (ticket.assignedAdminId) recipients.add(ticket.assignedAdminId);
  if (actorId) recipients.delete(actorId);
  return { ticket, recipients: Array.from(recipients) };
}

export async function notifyInternalTicket({
  ticketId,
  actorId,
  title,
  message,
}: {
  ticketId: string;
  actorId?: string;
  title: string;
  message: string;
}) {
  const { ticket, recipients } = await getInternalAssigneeRecipients(ticketId, actorId);
  if (!ticket || !recipients.length) return;
  await db.insert(notifications).values(recipients.map((recipientId) => ({
    recipientId,
    issueId: null,
    type: "STATUS_CHANGED" as const,
    title,
    message,
    link: `/dashboard/internal-tickets/${ticket.ticketNo}`,
  })));
}

export async function getActiveInternalUsers(roleNames = ["ADMIN", developerRole, qaRole]) {
  return db
    .select({ id: users.id, name: users.name, email: users.email, roleName: roles.roleName })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.status, "ACTIVE"), inArray(roles.roleName, roleNames)));
}



