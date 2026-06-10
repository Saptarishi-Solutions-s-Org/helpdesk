import { desc, eq, or } from "drizzle-orm";
import { issueActivity, issueAttachments, issueComments, issueStatusHistory, issues, modules, organizations, projects, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyIssueWatchers } from "@/lib/notifications";
import { createIssueSchema } from "@/lib/validators/issue";

const issueLookupFor = (id: string) => {
  const value = decodeURIComponent(id).trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(value)
    ? or(eq(issues.id, value), eq(issues.ticketNo, value))
    : eq(issues.ticketNo, value);
};

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    const issueLookup = issueLookupFor(id);
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
      .where(issueLookup)
      .limit(1);

    const issue = rows[0];
    if (!issue) return ok({ issue: null }, 404);
    if (session.role === "USER" && issue.organizationId !== session.organizationId) throw new Error("FORBIDDEN");

    const [comments, attachments, history, activity] = await Promise.all([
      db
        .select({
          id: issueComments.id,
          body: issueComments.body,
          bodyJson: issueComments.bodyJson,
          authorId: issueComments.authorId,
          authorName: users.name,
          createdAt: issueComments.createdAt,
        })
        .from(issueComments)
        .innerJoin(users, eq(issueComments.authorId, users.id))
        .where(eq(issueComments.issueId, issue.id))
        .orderBy(desc(issueComments.createdAt)),
      db.select().from(issueAttachments).where(eq(issueAttachments.issueId, issue.id)).orderBy(desc(issueAttachments.createdAt)),
      db
        .select({ id: issueStatusHistory.id, fromStatus: issueStatusHistory.fromStatus, toStatus: issueStatusHistory.toStatus, reason: issueStatusHistory.reason, actorName: users.name, createdAt: issueStatusHistory.createdAt })
        .from(issueStatusHistory)
        .innerJoin(users, eq(issueStatusHistory.actorId, users.id))
        .where(eq(issueStatusHistory.issueId, issue.id))
        .orderBy(desc(issueStatusHistory.createdAt)),
      db
        .select({
          id: issueActivity.id,
          type: issueActivity.type,
          message: issueActivity.message,
          metadata: issueActivity.metadata,
          actorName: users.name,
          createdAt: issueActivity.createdAt,
        })
        .from(issueActivity)
        .leftJoin(users, eq(issueActivity.actorId, users.id))
        .where(eq(issueActivity.issueId, issue.id))
        .orderBy(desc(issueActivity.createdAt)),
    ]);

    return ok({ issue, comments, attachments, history, activity, viewer: { id: session.id, role: session.role } });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    const body = await req.json();
    const parsed = createIssueSchema.safeParse(body);

    if (!parsed.success) {
      return ok({ message: parsed.error.issues[0]?.message ?? "Invalid issue details" }, 400);
    }

    const current = (await db.select().from(issues).where(issueLookupFor(id)).limit(1))[0];
    if (!current) return ok({ message: "Not found" }, 404);
    if (session.role !== "USER" || current.organizationId !== session.organizationId) throw new Error("FORBIDDEN");

    const changes: Array<{ field: string; from: string; to: string }> = [];
    if (current.title !== parsed.data.title) {
      changes.push({ field: "Title", from: current.title, to: parsed.data.title });
    }
    if (current.description !== parsed.data.description) {
      changes.push({ field: "Description", from: current.description, to: parsed.data.description });
    }

    const [updated] = await db
      .update(issues)
      .set({
        title: parsed.data.title,
        description: parsed.data.description,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, current.id))
      .returning();

    const activityRows = changes.map((change) => ({
      issueId: current.id,
      actorId: session.id,
      type: "ISSUE_UPDATED",
      message: `${change.field} updated`,
      metadata: change,
    }));

    if (body.attachmentUrl) {
      await db.insert(issueAttachments).values({
        issueId: current.id,
        uploadedById: session.id,
        url: body.attachmentUrl,
        publicId: body.attachmentUrl,
        resourceType: "file",
        fileName: body.attachmentLabel || body.attachmentUrl,
        sizeBytes: 0,
      });
      activityRows.push({
        issueId: current.id,
        actorId: session.id,
        type: "ISSUE_UPDATED",
        message: "Attachment added",
        metadata: { field: "Attachment", from: "", to: body.attachmentLabel || body.attachmentUrl },
      });
    }

    if (activityRows.length) {
      await db.insert(issueActivity).values(activityRows);
      await notifyIssueWatchers({
        issueId: current.id,
        actorId: session.id,
        type: "STATUS_CHANGED",
        title: `${current.ticketNo} updated`,
        message: `${session.name} updated the ticket details.`,
      });
    }

    return ok({ issue: updated });
  } catch (error) {
    return apiError(error);
  }
}
