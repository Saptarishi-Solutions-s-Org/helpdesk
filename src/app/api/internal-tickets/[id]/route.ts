import { desc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { internalTicketActivity, internalTicketComments, internalTicketStatusHistory, internalTicketWorklogs, internalTickets, issueAttachments, issueComments, issues, modules, organizations, projects, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveInternalUsers, isInternalRole } from "@/lib/internal-tickets";

const developer = alias(users, "internal_developer_detail");
const qa = alias(users, "internal_qa_detail");
const adminOwner = alias(users, "internal_admin_owner_detail");
const reporter = alias(users, "internal_parent_reporter");
const internalAuthor = alias(users, "internal_comment_author");
const clientAuthor = alias(users, "client_comment_author");
const historyActor = alias(users, "internal_history_actor");
const activityActor = alias(users, "internal_activity_actor");
const worklogWorker = alias(users, "internal_worklog_worker");

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ticketLookupFor = (id: string) => {
  const value = decodeURIComponent(id).trim();
  return uuidPattern.test(value)
    ? or(eq(internalTickets.id, value), eq(internalTickets.ticketNo, value))
    : eq(internalTickets.ticketNo, value);
};

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    if (!isInternalRole(session.role)) throw new Error("FORBIDDEN");
    const { id } = await context.params;

    const ticketRows = await db
      .select({
        id: internalTickets.id,
        ticketNo: internalTickets.ticketNo,
        parentIssueId: internalTickets.parentIssueId,
        parentTicketNo: issues.ticketNo,
        organizationId: internalTickets.organizationId,
        organizationName: organizations.name,
        reporterName: reporter.name,
        projectId: internalTickets.projectId,
        projectName: projects.name,
        moduleId: internalTickets.moduleId,
        moduleName: modules.name,
        type: issues.type,
        priority: issues.priority,
        status: internalTickets.status,
        title: internalTickets.title,
        description: internalTickets.description,
        descriptionJson: internalTickets.descriptionJson,
        assignedDeveloperId: internalTickets.assignedDeveloperId,
        developerName: developer.name,
        assignedQaId: internalTickets.assignedQaId,
        qaName: qa.name,
        assignedAdminId: internalTickets.assignedAdminId,
        adminName: adminOwner.name,
        createdAt: internalTickets.createdAt,
        updatedAt: internalTickets.updatedAt,
      })
      .from(internalTickets)
      .innerJoin(issues, eq(internalTickets.parentIssueId, issues.id))
      .innerJoin(organizations, eq(internalTickets.organizationId, organizations.id))
      .innerJoin(reporter, eq(issues.reporterId, reporter.id))
      .leftJoin(projects, eq(internalTickets.projectId, projects.id))
      .leftJoin(modules, eq(internalTickets.moduleId, modules.id))
      .leftJoin(developer, eq(internalTickets.assignedDeveloperId, developer.id))
      .leftJoin(qa, eq(internalTickets.assignedQaId, qa.id))
      .leftJoin(adminOwner, eq(internalTickets.assignedAdminId, adminOwner.id))
      .where(ticketLookupFor(id))
      .limit(1);

    const ticket = ticketRows[0] as ((typeof ticketRows)[number] & { id: string; parentIssueId: string; ticketNo: string }) | undefined;
    if (!ticket) return ok({ ticket: null }, 404);

    const [comments, clientThread, attachments, history, activity, worklogs, internalUsers] = await Promise.all([
      db
        .select({ id: internalTicketComments.id, body: internalTicketComments.body, bodyJson: internalTicketComments.bodyJson, authorId: internalTicketComments.authorId, authorName: internalAuthor.name, createdAt: internalTicketComments.createdAt })
        .from(internalTicketComments)
        .innerJoin(internalAuthor, eq(internalTicketComments.authorId, internalAuthor.id))
        .where(eq(internalTicketComments.internalTicketId, ticket.id))
        .orderBy(desc(internalTicketComments.createdAt)),
      db
        .select({ id: issueComments.id, body: issueComments.body, bodyJson: issueComments.bodyJson, authorName: clientAuthor.name, createdAt: issueComments.createdAt })
        .from(issueComments)
        .innerJoin(clientAuthor, eq(issueComments.authorId, clientAuthor.id))
        .where(eq(issueComments.issueId, ticket.parentIssueId))
        .orderBy(desc(issueComments.createdAt)),
      db.select().from(issueAttachments).where(eq(issueAttachments.issueId, ticket.parentIssueId)).orderBy(desc(issueAttachments.createdAt)),
      db
        .select({ id: internalTicketStatusHistory.id, fromStatus: internalTicketStatusHistory.fromStatus, toStatus: internalTicketStatusHistory.toStatus, reason: internalTicketStatusHistory.reason, actorName: historyActor.name, createdAt: internalTicketStatusHistory.createdAt })
        .from(internalTicketStatusHistory)
        .innerJoin(historyActor, eq(internalTicketStatusHistory.actorId, historyActor.id))
        .where(eq(internalTicketStatusHistory.internalTicketId, ticket.id))
        .orderBy(desc(internalTicketStatusHistory.createdAt)),
      db
        .select({ id: internalTicketActivity.id, type: internalTicketActivity.type, message: internalTicketActivity.message, metadata: internalTicketActivity.metadata, actorName: activityActor.name, createdAt: internalTicketActivity.createdAt })
        .from(internalTicketActivity)
        .leftJoin(activityActor, eq(internalTicketActivity.actorId, activityActor.id))
        .where(eq(internalTicketActivity.internalTicketId, ticket.id))
        .orderBy(desc(internalTicketActivity.createdAt)),
      db
        .select({ id: internalTicketWorklogs.id, developerId: internalTicketWorklogs.developerId, workerId: internalTicketWorklogs.workerId, workerRole: internalTicketWorklogs.workerRole, developerName: worklogWorker.name, stopReason: internalTicketWorklogs.stopReason, startedAt: internalTicketWorklogs.startedAt, stoppedAt: internalTicketWorklogs.stoppedAt, durationMinutes: internalTicketWorklogs.durationMinutes, note: internalTicketWorklogs.note })
        .from(internalTicketWorklogs)
        .leftJoin(worklogWorker, eq(internalTicketWorklogs.workerId, worklogWorker.id))
        .where(eq(internalTicketWorklogs.internalTicketId, ticket.id))
        .orderBy(desc(internalTicketWorklogs.startedAt)),
      getActiveInternalUsers(),
    ]);

    return ok({ ticket, comments, clientThread, attachments, history, activity, worklogs, internalUsers, viewer: { id: session.id, role: session.role } });
  } catch (error) {
    return apiError(error);
  }
}






