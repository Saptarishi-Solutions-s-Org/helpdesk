import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { coreTickets, notifications, roles, users } from "@/db/schema";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

export const coreRoles = ["ADMIN", "DEVELOPER", "QUALITY ANALYST"] as const;

export const epicStatuses = ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as const;

export const devStatuses = [
  "NEW",
  "ACCEPTED",
  "DEV_IN_PROGRESS",
  "DEV_REVIEW",
  "READY_FOR_QA",
  "QA_IN_PROGRESS",
  "READY_FOR_PRODUCTION",
  "REOPENED",
] as const;

export const openDevStatuses = [
  "NEW",
  "ACCEPTED",
  "DEV_IN_PROGRESS",
  "DEV_REVIEW",
  "READY_FOR_QA",
  "QA_IN_PROGRESS",
  "REOPENED",
] as const;

export const epicTypes = ["EPIC"] as const;
export const childTypes = ["TASK", "SUBTASK", "IMPROVEMENT", "FEATURE", "DOCUMENTATION"] as const;
export const allTypes = [...epicTypes, ...childTypes] as const;

export function isCoreRole(role: string) {
  return coreRoles.includes(role as (typeof coreRoles)[number]);
}

export function requireCoreRole(session: SessionUser) {
  if (!isCoreRole(session.role)) throw new Error("FORBIDDEN");
}

export function isEpicType(type: string) {
  return epicTypes.includes(type as (typeof epicTypes)[number]);
}

export function isChildType(type: string) {
  return childTypes.includes(type as (typeof childTypes)[number]);
}

export function isEpicStatus(status: string) {
  return epicStatuses.includes(status as (typeof epicStatuses)[number]);
}

export function isDevStatus(status: string) {
  return devStatuses.includes(status as (typeof devStatuses)[number]);
}

export async function nextCoreTicketCode() {
  const [latest] = await db
    .select({ ticketNo: coreTickets.ticketNo })
    .from(coreTickets)
    .where(ilike(coreTickets.ticketNo, "SRS-CORE-%"))
    .orderBy(desc(coreTickets.ticketNo))
    .limit(1);
  const lastNumber = Number(latest?.ticketNo?.replace(/\D/g, "") || "0");
  return `SRS-CORE-${String(lastNumber + 1).padStart(3, "0")}`;
}

export async function getCoreAssigneeRecipients(ticketId: string, actorId?: string) {
  const [ticket] = await db
    .select({
      id: coreTickets.id,
      assignedDeveloperId: coreTickets.assignedDeveloperId,
      assignedQaId: coreTickets.assignedQaId,
      assignedAdminId: coreTickets.assignedAdminId,
      ticketNo: coreTickets.ticketNo,
    })
    .from(coreTickets)
    .where(eq(coreTickets.id, ticketId))
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

export async function notifyCoreTicket({
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
  const { ticket, recipients } = await getCoreAssigneeRecipients(ticketId, actorId);
  if (!ticket || !recipients.length) return;
  await db.insert(notifications).values(
    recipients.map((recipientId) => ({
      recipientId,
      issueId: null,
      type: "STATUS_CHANGED" as const,
      title,
      message,
      link: `/dashboard/core-tickets/${ticket.ticketNo}`,
    })),
  );
}

export async function getActiveCoreUsers(roleNames = ["ADMIN", "DEVELOPER", "QUALITY ANALYST"]) {
  return db
    .select({ id: users.id, name: users.name, email: users.email, roleName: roles.roleName })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.status, "ACTIVE"), inArray(roles.roleName, roleNames)));
}

export const epicStatusTransitions: Record<string, string[]> = {
  NEW: ["OPEN"],
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["DONE", "CANCELLED"],
  DONE: ["CANCELLED"],
  CANCELLED: [],
};

export const devStatusTransitions: Record<string, string[]> = {
  NEW: ["ACCEPTED"],
  REOPENED: ["ACCEPTED"],
  ACCEPTED: ["DEV_IN_PROGRESS"],
  DEV_IN_PROGRESS: ["DEV_REVIEW", "READY_FOR_QA"],
  DEV_REVIEW: ["READY_FOR_QA", "DEV_IN_PROGRESS"],
  READY_FOR_QA: ["QA_IN_PROGRESS"],
  QA_IN_PROGRESS: ["READY_FOR_PRODUCTION", "REOPENED"],
};

export function validTransition(currentStatus: string, targetStatus: string, type: string) {
  if (isEpicType(type)) {
    return (epicStatusTransitions[currentStatus] ?? []).includes(targetStatus);
  }
  return (devStatusTransitions[currentStatus] ?? []).includes(targetStatus);
}
