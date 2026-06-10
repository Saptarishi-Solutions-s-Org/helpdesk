import { sql } from "drizzle-orm";
import { ticketSequences } from "@/db/schema";
import type { db as drizzleDb } from "@/lib/db";

export const PENDING_PROJECT_SEGMENT = "PEN";

export const openStatuses = [
  "OPEN",
  "TRIAGED",
  "IN_PROGRESS",
  "WAITING_FROM_CLIENT",
  "REOPENED",
] as const;

export function isClosedStatus(status: string) {
  return status === "CLOSED" || status === "RESOLVED" || status === "CANCELLED";
}

export function buildTicketNo(orgShortCode: string, projectSegment: string, number: number) {
  return `SHD-${orgShortCode.toUpperCase()}-${projectSegment.toUpperCase()}-${number}`;
}

type TicketSequenceTx = Pick<typeof drizzleDb, "insert">;

export async function nextTicketNo(
  tx: TicketSequenceTx,
  scope: {
    organizationId: string;
    projectId: string | null;
    orgShortCode: string;
    projectSegment: string;
  },
) {
  const [sequence] = await tx
    .insert(ticketSequences)
    .values({
      organizationId: scope.organizationId,
      projectId: scope.projectId,
      projectSegment: scope.projectSegment,
      lastNumber: 1,
    })
    .onConflictDoUpdate({
      target: [ticketSequences.organizationId, ticketSequences.projectSegment],
      set: {
        lastNumber: sql`${ticketSequences.lastNumber} + 1`,
        projectId: scope.projectId,
        updatedAt: new Date(),
      },
    })
    .returning({ lastNumber: ticketSequences.lastNumber });

  return buildTicketNo(scope.orgShortCode, scope.projectSegment, sequence.lastNumber);
}
