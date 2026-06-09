import { eq } from "drizzle-orm";
import { issueActivity, issueAttachments, issueComments, issueStatusHistory, issues, modules, organizations, projects, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    const rows = await db
      .select({
        id: issues.id,
        ticketNo: issues.ticketNo,
        title: issues.title,
        description: issues.description,
        type: issues.type,
        priority: issues.priority,
        status: issues.status,
        reopenedCount: issues.reopenedCount,
        organizationId: issues.organizationId,
        organizationName: organizations.name,
        reporterId: issues.reporterId,
        reporterName: users.name,
        projectId: issues.projectId,
        projectName: projects.name,
        moduleId: issues.moduleId,
        moduleName: modules.name,
        createdAt: issues.createdAt,
        updatedAt: issues.updatedAt,
      })
      .from(issues)
      .innerJoin(organizations, eq(issues.organizationId, organizations.id))
      .innerJoin(users, eq(issues.reporterId, users.id))
      .leftJoin(projects, eq(issues.projectId, projects.id))
      .leftJoin(modules, eq(issues.moduleId, modules.id))
      .where(eq(issues.id, id))
      .limit(1);

    const issue = rows[0];
    if (!issue) return ok({ issue: null }, 404);
    if (session.role === "USER" && issue.reporterId !== session.id) throw new Error("FORBIDDEN");

    const [comments, attachments, history, activity] = await Promise.all([
      db
        .select({ id: issueComments.id, body: issueComments.body, authorName: users.name, createdAt: issueComments.createdAt })
        .from(issueComments)
        .innerJoin(users, eq(issueComments.authorId, users.id))
        .where(eq(issueComments.issueId, id)),
      db.select().from(issueAttachments).where(eq(issueAttachments.issueId, id)),
      db
        .select({ id: issueStatusHistory.id, fromStatus: issueStatusHistory.fromStatus, toStatus: issueStatusHistory.toStatus, reason: issueStatusHistory.reason, actorName: users.name, createdAt: issueStatusHistory.createdAt })
        .from(issueStatusHistory)
        .innerJoin(users, eq(issueStatusHistory.actorId, users.id))
        .where(eq(issueStatusHistory.issueId, id)),
      db.select().from(issueActivity).where(eq(issueActivity.issueId, id)),
    ]);

    return ok({ issue, comments, attachments, history, activity });
  } catch (error) {
    return apiError(error);
  }
}
