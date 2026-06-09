import { and, desc, eq, inArray } from "drizzle-orm";
import { issueActivity, issueStatusHistory, issues, modules, organizations, projects, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { nextTicketNo, openStatuses } from "@/lib/issues";
import { notifyIssueWatchers } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const session = await requireUser();
    const url = new URL(req.url);
    const view = url.searchParams.get("view");
    const filters = [];
    if (session.role === "USER") filters.push(eq(issues.reporterId, session.id));
    if (view === "open") filters.push(inArray(issues.status, [...openStatuses]));
    if (view === "closed") filters.push(inArray(issues.status, ["RESOLVED", "CLOSED", "CANCELLED"]));

    const rows = await db
      .select({
        id: issues.id,
        ticketNo: issues.ticketNo,
        title: issues.title,
        type: issues.type,
        priority: issues.priority,
        status: issues.status,
        reopenedCount: issues.reopenedCount,
        createdAt: issues.createdAt,
        updatedAt: issues.updatedAt,
        organizationName: organizations.name,
        reporterName: users.name,
        projectName: projects.name,
        moduleName: modules.name,
      })
      .from(issues)
      .innerJoin(organizations, eq(issues.organizationId, organizations.id))
      .innerJoin(users, eq(issues.reporterId, users.id))
      .leftJoin(projects, eq(issues.projectId, projects.id))
      .leftJoin(modules, eq(issues.moduleId, modules.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(issues.updatedAt));

    const stats = {
      total: rows.length,
      open: rows.filter((row) => openStatuses.includes(row.status as never)).length,
      closed: rows.filter((row) => ["RESOLVED", "CLOSED", "CANCELLED"].includes(row.status)).length,
      waiting: rows.filter((row) => row.status === "WAITING_FOR_USER").length,
      reopened: rows.filter((row) => row.reopenedCount > 0 || row.status === "REOPENED").length,
    };

    return ok({ issues: rows, stats });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser();
    if (!session.organizationId && session.role === "USER") throw new Error("FORBIDDEN");
    const body = await req.json();
    const orgId = body.organizationId || session.organizationId;
    if (session.role === "USER" && orgId !== session.organizationId) throw new Error("FORBIDDEN");

    const rows = await db
      .insert(issues)
      .values({
        ticketNo: nextTicketNo(),
        organizationId: orgId,
        reporterId: session.id,
        type: body.type,
        priority: body.priority || "MEDIUM",
        title: body.title,
        description: body.description,
        descriptionJson: body.descriptionJson || null,
      })
      .returning();

    await db.insert(issueStatusHistory).values({
      issueId: rows[0].id,
      actorId: session.id,
      toStatus: "OPEN",
      reason: "Issue created",
    });
    await db.insert(issueActivity).values({
      issueId: rows[0].id,
      actorId: session.id,
      type: "ISSUE_CREATED",
      message: `${session.name} created ${rows[0].ticketNo}`,
    });
    await notifyIssueWatchers({
      issueId: rows[0].id,
      actorId: session.id,
      type: "ISSUE_CREATED",
      title: `${rows[0].ticketNo} created`,
      message: rows[0].title,
    });

    return ok({ issue: rows[0] }, 201);
  } catch (error) {
    return apiError(error);
  }
}
