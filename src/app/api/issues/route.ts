import { and, desc, eq, inArray } from "drizzle-orm";
import { issueActivity, issueStatusHistory, issues, modules, organizationProjects, organizations, projects, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { nextTicketNo, openStatuses, PENDING_PROJECT_SEGMENT } from "@/lib/issues";
import { notifyIssueWatchers } from "@/lib/notifications";
import { createIssueSchema } from "@/lib/validators/issue";

export async function GET(req: Request) {
  try {
    const session = await requireUser();
    const url = new URL(req.url);
    const view = url.searchParams.get("view");
    const filters = [];
    if (session.role === "CLIENT") {
      if (!session.organizationId) throw new Error("FORBIDDEN");
      filters.push(eq(issues.organizationId, session.organizationId));
    }
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
      waiting: rows.filter((row) => row.status === "WAITING_FROM_CLIENT").length,
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
    if (!session.organizationId && session.role === "CLIENT") throw new Error("FORBIDDEN");
    const body = await req.json();
    const parsed = createIssueSchema.safeParse(body);

    if (!parsed.success) {
      return ok({ message: parsed.error.issues[0]?.message ?? "Invalid issue details" }, 400);
    }

    const orgId = body.organizationId || session.organizationId;
    if (!orgId) throw new Error("FORBIDDEN");
    if (session.role === "CLIENT" && orgId !== session.organizationId) throw new Error("FORBIDDEN");

    const [organization] = await db
      .select({ id: organizations.id, shortCode: organizations.shortCode })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    if (!organization) return ok({ message: "Organization not found" }, 404);

    const linkedProjects = await db
      .select({ id: projects.id, shortCode: projects.shortCode })
      .from(organizationProjects)
      .innerJoin(projects, eq(organizationProjects.projectId, projects.id))
      .where(and(eq(organizationProjects.organizationId, orgId), eq(projects.isActive, true)))
      .orderBy(projects.code);

    if (linkedProjects.length === 0) {
      return ok({ message: "No project is linked to your organization. Please contact Admin." }, 400);
    }

    const assignedProject = linkedProjects.length === 1 ? linkedProjects[0] : null;
    const projectSegment = assignedProject?.shortCode ?? PENDING_PROJECT_SEGMENT;

    const rows = await db.transaction(async (tx) => {
      const ticketNo = await nextTicketNo(tx, {
        organizationId: orgId,
        projectId: assignedProject?.id ?? null,
        orgShortCode: organization.shortCode,
        projectSegment,
      });

      return tx
        .insert(issues)
        .values({
          ticketNo,
          organizationId: orgId,
          reporterId: session.id,
          projectId: assignedProject?.id ?? null,
          type: null,
          priority: null,
          title: parsed.data.title,
          description: parsed.data.description,
          descriptionJson: body.descriptionJson || null,
        })
        .returning();
    });

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
