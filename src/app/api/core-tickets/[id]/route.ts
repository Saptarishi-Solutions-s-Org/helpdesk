import { desc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  coreTicketActivity,
  coreTicketAttachments,
  coreTicketComments,
  coreTicketLinks,
  coreTicketStatusHistory,
  coreTicketWorklogs,
  coreTickets,
  modules,
  projects,
  users,
} from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveCoreUsers, isCoreRole, requireCoreRole } from "@/lib/core-tickets";

const developer = alias(users, "core_detail_developer");
const qa = alias(users, "core_detail_qa");
const adminOwner = alias(users, "core_detail_admin");
const creator = alias(users, "core_detail_creator");
const epicTicket = alias(coreTickets, "core_detail_epic");
const parentTaskTicket = alias(coreTickets, "core_detail_parent_task");
const commentAuthor = alias(users, "core_comment_author");
const historyActor = alias(users, "core_history_actor");
const activityActor = alias(users, "core_activity_actor");
const worklogWorker = alias(users, "core_worklog_worker");
const linkSource = alias(coreTickets, "core_link_source");
const linkTarget = alias(coreTickets, "core_link_target");

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ticketLookupFor = (id: string) => {
  const value = decodeURIComponent(id).trim();
  return uuidPattern.test(value)
    ? or(eq(coreTickets.id, value), eq(coreTickets.ticketNo, value))
    : eq(coreTickets.ticketNo, value);
};

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    if (!isCoreRole(session.role)) throw new Error("FORBIDDEN");
    const { id } = await context.params;

    const ticketRows = await db
      .select({
        id: coreTickets.id,
        ticketNo: coreTickets.ticketNo,
        type: coreTickets.type,
        priority: coreTickets.priority,
        status: coreTickets.status,
        title: coreTickets.title,
        description: coreTickets.description,
        descriptionJson: coreTickets.descriptionJson,
        epicId: coreTickets.epicId,
        epicTicketNo: epicTicket.ticketNo,
        parentTaskId: coreTickets.parentTaskId,
        parentTaskTicketNo: parentTaskTicket.ticketNo,
        projectId: coreTickets.projectId,
        projectName: projects.name,
        moduleId: coreTickets.moduleId,
        moduleName: modules.name,
        assignedDeveloperId: coreTickets.assignedDeveloperId,
        developerName: developer.name,
        assignedQaId: coreTickets.assignedQaId,
        qaName: qa.name,
        assignedAdminId: coreTickets.assignedAdminId,
        adminName: adminOwner.name,
        createdById: coreTickets.createdById,
        createdByName: creator.name,
        acceptedAt: coreTickets.acceptedAt,
        devStartedAt: coreTickets.devStartedAt,
        readyForQaAt: coreTickets.readyForQaAt,
        qaStartedAt: coreTickets.qaStartedAt,
        readyForProductionAt: coreTickets.readyForProductionAt,
        reopenedAt: coreTickets.reopenedAt,
        closedAt: coreTickets.closedAt,
        createdAt: coreTickets.createdAt,
        updatedAt: coreTickets.updatedAt,
      })
      .from(coreTickets)
      .leftJoin(epicTicket, eq(coreTickets.epicId, epicTicket.id))
      .leftJoin(parentTaskTicket, eq(coreTickets.parentTaskId, parentTaskTicket.id))
      .leftJoin(projects, eq(coreTickets.projectId, projects.id))
      .leftJoin(modules, eq(coreTickets.moduleId, modules.id))
      .leftJoin(developer, eq(coreTickets.assignedDeveloperId, developer.id))
      .leftJoin(qa, eq(coreTickets.assignedQaId, qa.id))
      .leftJoin(adminOwner, eq(coreTickets.assignedAdminId, adminOwner.id))
      .leftJoin(creator, eq(coreTickets.createdById, creator.id))
      .where(ticketLookupFor(id))
      .limit(1);

    const ticket = ticketRows[0];
    if (!ticket) return ok({ ticket: null }, 404);

    const [comments, history, activity, worklogs, internalUsers, childTickets, links, attachments] = await Promise.all([
      db
        .select({
          id: coreTicketComments.id,
          body: coreTicketComments.body,
          bodyJson: coreTicketComments.bodyJson,
          authorId: coreTicketComments.authorId,
          authorName: commentAuthor.name,
          createdAt: coreTicketComments.createdAt,
        })
        .from(coreTicketComments)
        .innerJoin(commentAuthor, eq(coreTicketComments.authorId, commentAuthor.id))
        .where(eq(coreTicketComments.coreTicketId, ticket.id))
        .orderBy(desc(coreTicketComments.createdAt)),
      db
        .select({
          id: coreTicketStatusHistory.id,
          fromStatus: coreTicketStatusHistory.fromStatus,
          toStatus: coreTicketStatusHistory.toStatus,
          reason: coreTicketStatusHistory.reason,
          actorName: historyActor.name,
          createdAt: coreTicketStatusHistory.createdAt,
        })
        .from(coreTicketStatusHistory)
        .innerJoin(historyActor, eq(coreTicketStatusHistory.actorId, historyActor.id))
        .where(eq(coreTicketStatusHistory.coreTicketId, ticket.id))
        .orderBy(desc(coreTicketStatusHistory.createdAt)),
      db
        .select({
          id: coreTicketActivity.id,
          type: coreTicketActivity.type,
          message: coreTicketActivity.message,
          metadata: coreTicketActivity.metadata,
          actorName: activityActor.name,
          createdAt: coreTicketActivity.createdAt,
        })
        .from(coreTicketActivity)
        .leftJoin(activityActor, eq(coreTicketActivity.actorId, activityActor.id))
        .where(eq(coreTicketActivity.coreTicketId, ticket.id))
        .orderBy(desc(coreTicketActivity.createdAt)),
      db
        .select({
          id: coreTicketWorklogs.id,
          workerId: coreTicketWorklogs.workerId,
          workerRole: coreTicketWorklogs.workerRole,
          workerName: worklogWorker.name,
          startedAt: coreTicketWorklogs.startedAt,
          stoppedAt: coreTicketWorklogs.stoppedAt,
          durationMinutes: coreTicketWorklogs.durationMinutes,
          note: coreTicketWorklogs.note,
        })
        .from(coreTicketWorklogs)
        .leftJoin(worklogWorker, eq(coreTicketWorklogs.workerId, worklogWorker.id))
        .where(eq(coreTicketWorklogs.coreTicketId, ticket.id))
        .orderBy(desc(coreTicketWorklogs.startedAt)),
      getActiveCoreUsers(),
      db
        .select({
          id: coreTickets.id,
          ticketNo: coreTickets.ticketNo,
          title: coreTickets.title,
          type: coreTickets.type,
          status: coreTickets.status,
        })
        .from(coreTickets)
        .where(eq(coreTickets.epicId, ticket.id))
        .orderBy(desc(coreTickets.createdAt)),
      db
        .select({
          id: coreTicketLinks.id,
          linkType: coreTicketLinks.linkType,
          sourceTicketId: coreTicketLinks.sourceTicketId,
          sourceTicketNo: linkSource.ticketNo,
          sourceTitle: linkSource.title,
          targetTicketId: coreTicketLinks.targetTicketId,
          targetTicketNo: linkTarget.ticketNo,
          targetTitle: linkTarget.title,
          createdAt: coreTicketLinks.createdAt,
        })
        .from(coreTicketLinks)
        .leftJoin(linkSource, eq(coreTicketLinks.sourceTicketId, linkSource.id))
        .leftJoin(linkTarget, eq(coreTicketLinks.targetTicketId, linkTarget.id))
        .where(or(eq(coreTicketLinks.sourceTicketId, ticket.id), eq(coreTicketLinks.targetTicketId, ticket.id)))
        .orderBy(desc(coreTicketLinks.createdAt)),
      db
        .select()
        .from(coreTicketAttachments)
        .where(eq(coreTicketAttachments.coreTicketId, ticket.id))
        .orderBy(desc(coreTicketAttachments.createdAt)),
    ]);

    return ok({
      ticket,
      comments,
      history,
      activity,
      worklogs,
      internalUsers,
      childTickets,
      links,
      attachments,
      viewer: { id: session.id, role: session.role },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    requireCoreRole(session);
    const { id } = await context.params;

    const body = await req.json();
    const { title, description, descriptionJson, priority, projectId, moduleId } = body;

    const [ticket] = await db
      .update(coreTickets)
      .set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(descriptionJson !== undefined && { descriptionJson }),
        ...(priority !== undefined && { priority }),
        ...(projectId !== undefined && { projectId }),
        ...(moduleId !== undefined && { moduleId }),
        updatedAt: new Date(),
      })
      .where(ticketLookupFor(id))
      .returning();

    if (!ticket) return ok({ ticket: null }, 404);

    await db.insert(coreTicketActivity).values({
      coreTicketId: ticket.id,
      actorId: session.id,
      type: "UPDATED",
      message: `Updated ${ticket.ticketNo}`,
    });

    return ok({ ticket });
  } catch (error) {
    return apiError(error);
  }
}
