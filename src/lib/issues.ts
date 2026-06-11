import { sql } from "drizzle-orm";
import { ticketSequences } from "@/db/schema";
import type { db as drizzleDb } from "@/lib/db";

export const ORG_TICKET_SEGMENT = "ORG";
export const legacyStatuses = ["OPEN", "TRIAGED"] as const;
export const workflowStatuses = [
  "WAITING_FOR_SUPPORT",
  "BACKLOG",
  "IN_ANALYSIS",
  "IN_PROGRESS",
  "WAITING_FROM_CLIENT",
  "QUEUED_FOR_RELEASE",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
] as const;

export const openStatuses = [
  "OPEN",
  "TRIAGED",
  "WAITING_FOR_SUPPORT",
  "BACKLOG",
  "IN_ANALYSIS",
  "IN_PROGRESS",
  "WAITING_FROM_CLIENT",
  "QUEUED_FOR_RELEASE",
  "REOPENED",
] as const;

export function isClosedStatus(status: string) {
  return status === "CLOSED" || status === "RESOLVED" || status === "CANCELLED";
}

export function buildTicketNo(orgShortCode: string, number: number) {
  return `SHD-${orgShortCode.toUpperCase()}-${number}`;
}

type TicketSequenceTx = Pick<typeof drizzleDb, "insert">;

export async function nextTicketNo(
  tx: TicketSequenceTx,
  scope: {
    organizationId: string;
    orgShortCode: string;
  },
) {
  const [sequence] = await tx
    .insert(ticketSequences)
    .values({
      organizationId: scope.organizationId,
      projectId: null,
      projectSegment: ORG_TICKET_SEGMENT,
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

  return buildTicketNo(scope.orgShortCode, sequence.lastNumber);
}
