import { and, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { internalTickets, issues, modules, organizations, projects, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isInternalRole, openInternalStatuses } from "@/lib/internal-tickets";

const developer = alias(users, "internal_developer");
const qa = alias(users, "internal_qa");
const adminOwner = alias(users, "internal_admin_owner");

export async function GET(req: Request) {
  try {
    const session = await requireUser();
    if (!isInternalRole(session.role)) throw new Error("FORBIDDEN");

    const url = new URL(req.url);
    const view = url.searchParams.get("view");
    const filters = [];
    if (view === "open") filters.push(inArray(internalTickets.status, [...openInternalStatuses]));
    if (view === "ready") filters.push(eq(internalTickets.status, "READY_FOR_PRODUCTION"));

    const rows = await db
      .select({
        id: internalTickets.id,
        ticketNo: internalTickets.ticketNo,
        parentIssueId: internalTickets.parentIssueId,
        title: internalTickets.title,
        status: internalTickets.status,
        type: issues.type,
        priority: issues.priority,
        organizationName: organizations.name,
        projectName: projects.name,
        moduleName: modules.name,
        developerName: developer.name,
        qaName: qa.name,
        adminName: adminOwner.name,
        createdAt: internalTickets.createdAt,
        updatedAt: internalTickets.updatedAt,
      })
      .from(internalTickets)
      .innerJoin(issues, eq(internalTickets.parentIssueId, issues.id))
      .innerJoin(organizations, eq(internalTickets.organizationId, organizations.id))
      .leftJoin(projects, eq(internalTickets.projectId, projects.id))
      .leftJoin(modules, eq(internalTickets.moduleId, modules.id))
      .leftJoin(developer, eq(internalTickets.assignedDeveloperId, developer.id))
      .leftJoin(qa, eq(internalTickets.assignedQaId, qa.id))
      .leftJoin(adminOwner, eq(internalTickets.assignedAdminId, adminOwner.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(internalTickets.updatedAt));

    const stats = {
      total: rows.length,
      open: rows.filter((row) => openInternalStatuses.includes(row.status as never)).length,
      new: rows.filter((row) => row.status === "NEW").length,
      dev: rows.filter((row) => ["ACCEPTED", "DEV_IN_PROGRESS", "DEV_REVIEW"].includes(row.status)).length,
      qa: rows.filter((row) => ["READY_FOR_QA", "QA_IN_PROGRESS"].includes(row.status)).length,
      ready: rows.filter((row) => row.status === "READY_FOR_PRODUCTION").length,
      reopened: rows.filter((row) => row.status === "REOPENED").length,
    };

    return ok({ tickets: rows, stats });
  } catch (error) {
    return apiError(error);
  }
}




