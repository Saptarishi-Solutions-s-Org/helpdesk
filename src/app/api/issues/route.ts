import { and, desc, eq, inArray } from "drizzle-orm";
import { issueActivity, issueAttachments, issueStatusHistory, issues, modules, organizationProjects, organizations, projects, roles, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { nextTicketNo, openStatuses } from "@/lib/issues";
import { notifyIssueWatchers } from "@/lib/notifications";
import { attachmentLinkSchema, createIssueSchema } from "@/lib/validators/issue";

export async function GET(req: Request) {
  try {
    const session = await requireUser();
    if (!["ADMIN", "CLIENT"].includes(session.role)) throw new Error("FORBIDDEN");
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
    if (!["ADMIN", "CLIENT"].includes(session.role)) throw new Error("FORBIDDEN");
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

    const reporterId = session.role === "ADMIN" ? body.reporterId : session.id;
    if (!reporterId) return ok({ message: "Reported by client is required" }, 400);

    const [reporter] = await db
      .select({ id: users.id, organizationId: users.organizationId, roleName: roles.roleName, status: users.status })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, reporterId))
      .limit(1);
    if (!reporter || reporter.organizationId !== orgId || reporter.roleName !== "CLIENT" || reporter.status !== "ACTIVE") {
      return ok({ message: "Select an active client from the selected organization" }, 400);
    }

    const linkedProjects = await db
      .select({ id: projects.id })
      .from(organizationProjects)
      .innerJoin(projects, eq(organizationProjects.projectId, projects.id))
      .where(and(eq(organizationProjects.organizationId, orgId), eq(projects.isActive, true)))
      .orderBy(projects.code);

    if (linkedProjects.length === 0) {
      return ok({ message: "No project is linked to your organization. Please contact Admin." }, 400);
    }

    const assignedProject = linkedProjects.length === 1 ? linkedProjects[0] : null;
    const attachmentPayloads = Array.isArray(body.attachments)
      ? body.attachments
      : body.attachmentUrl
        ? [{ url: body.attachmentUrl, label: body.attachmentLabel }]
        : [];
    const parsedAttachments: Array<{ url: string; label?: string }> = [];
    for (const item of attachmentPayloads) {
      if (!item?.url?.trim()) continue;
      const parsedAttachment = attachmentLinkSchema.safeParse(item);
      if (!parsedAttachment.success) {
        return ok({ message: parsedAttachment.error.issues[0]?.message ?? "Invalid attachment link" }, 400);
      }
      parsedAttachments.push(parsedAttachment.data);
    }

    const rows = await db.transaction(async (tx) => {
      const ticketNo = await nextTicketNo(tx, {
        organizationId: orgId,
        orgShortCode: organization.shortCode,
      });

      const inserted = await tx
        .insert(issues)
        .values({
          ticketNo,
          organizationId: orgId,
          reporterId,
          projectId: assignedProject?.id ?? null,
          type: null,
          priority: null,
          status: "WAITING_FOR_SUPPORT",
          title: parsed.data.title,
          description: parsed.data.description,
          descriptionJson: body.descriptionJson || null,
        })
        .returning();

      if (parsedAttachments.length) {
        await tx.insert(issueAttachments).values(parsedAttachments.map((attachment) => ({
          issueId: inserted[0].id,
          uploadedById: session.id,
          url: attachment.url,
          publicId: attachment.url,
          resourceType: "file" as const,
          fileName: attachment.label || attachment.url,
          sizeBytes: 0,
        })));
      }

      return inserted;
    });

    await db.insert(issueStatusHistory).values({
      issueId: rows[0].id,
      actorId: session.id,
      toStatus: "WAITING_FOR_SUPPORT",
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



