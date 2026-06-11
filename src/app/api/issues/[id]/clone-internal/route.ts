import { eq, or } from "drizzle-orm";
import { internalTicketActivity, internalTicketStatusHistory, internalTickets, issues, organizations } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { nextInternalTicketNo, notifyInternalTicket } from "@/lib/internal-tickets";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const issueLookupFor = (id: string) => {
  const value = decodeURIComponent(id).trim();
  return uuidPattern.test(value) ? or(eq(issues.id, value), eq(issues.ticketNo, value)) : eq(issues.ticketNo, value);
};

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await context.params;

    const [issue] = await db
      .select({
        id: issues.id,
        ticketNo: issues.ticketNo,
        organizationId: issues.organizationId,
        orgShortCode: organizations.shortCode,
        projectId: issues.projectId,
        moduleId: issues.moduleId,
        type: issues.type,
        priority: issues.priority,
        title: issues.title,
        description: issues.description,
        descriptionJson: issues.descriptionJson,
      })
      .from(issues)
      .innerJoin(organizations, eq(issues.organizationId, organizations.id))
      .where(issueLookupFor(id))
      .limit(1);

    if (!issue) return ok({ message: "Ticket not found" }, 404);

    const [existing] = await db
      .select({ id: internalTickets.id, ticketNo: internalTickets.ticketNo })
      .from(internalTickets)
      .where(eq(internalTickets.parentIssueId, issue.id))
      .limit(1);

    if (existing) return ok({ ticket: existing, message: "Internal ticket already exists" }, 200);

    const [ticket] = await db.transaction(async (tx) => {
      const ticketNo = await nextInternalTicketNo(tx, {
        organizationId: issue.organizationId,
        orgShortCode: issue.orgShortCode,
      });

      const inserted = await tx
        .insert(internalTickets)
        .values({
          ticketNo,
          parentIssueId: issue.id,
          organizationId: issue.organizationId,
          projectId: issue.projectId,
          moduleId: issue.moduleId,
          type: issue.type,
          priority: issue.priority,
          status: "NEW",
          title: issue.title,
          description: issue.description,
          descriptionJson: issue.descriptionJson,
          assignedAdminId: session.id,
          createdById: session.id,
        })
        .returning();

      await tx.insert(internalTicketStatusHistory).values({
        internalTicketId: inserted[0].id,
        actorId: session.id,
        toStatus: "NEW",
        reason: `Cloned from ${issue.ticketNo}`,
      });
      await tx.insert(internalTicketActivity).values({
        internalTicketId: inserted[0].id,
        actorId: session.id,
        type: "CLONED",
        message: `${session.name} cloned ${issue.ticketNo} into ${ticketNo}`,
        metadata: { parentTicketNo: issue.ticketNo },
      });

      return inserted;
    });

    await notifyInternalTicket({
      ticketId: ticket.id,
      actorId: session.id,
      title: `${ticket.ticketNo} created`,
      message: `${issue.ticketNo} was cloned for internal workflow.`,
    });

    return ok({ ticket }, 201);
  } catch (error) {
    return apiError(error);
  }
}
