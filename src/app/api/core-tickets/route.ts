import { NextResponse } from "next/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { coreTicketAttachments, coreTickets, coreTicketActivity, coreTicketStatusHistory, modules, projects, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  childTypes,
  coreRoles,
  isChildType,
  isCoreRole,
  isEpicType,
  nextCoreTicketCode,
  openDevStatuses,
  requireCoreRole,
} from "@/lib/core-tickets";

const developer = alias(users, "core_developer");
const qa = alias(users, "core_qa");
const adminOwner = alias(users, "core_admin_owner");
const creator = alias(users, "core_creator");

export async function GET(req: Request) {
  try {
    const session = await requireUser();
    if (!isCoreRole(session.role)) throw new Error("FORBIDDEN");

    const url = new URL(req.url);
    const view = url.searchParams.get("view");
    const type = url.searchParams.get("type");
    const filters: ReturnType<typeof eq>[] = [];
    if (view === "open") filters.push(inArray(coreTickets.status, [...openDevStatuses]));
    if (type) {
      if (type === "epic") filters.push(eq(coreTickets.type, "EPIC" as const));
      else if (type === "child") filters.push(inArray(coreTickets.type, [...childTypes]));
      else filters.push(eq(coreTickets.type, type as "BUG" | "CR" | "ISSUE" | "SERVICE_REQUEST" | "EPIC" | "TASK" | "SUBTASK" | "IMPROVEMENT" | "FEATURE" | "DOCUMENTATION"));
    }

    const rows = await db
      .select({
        id: coreTickets.id,
        ticketNo: coreTickets.ticketNo,
        title: coreTickets.title,
        type: coreTickets.type,
        priority: coreTickets.priority,
        status: coreTickets.status,
        epicId: coreTickets.epicId,
        parentTaskId: coreTickets.parentTaskId,
        projectName: projects.name,
        moduleName: modules.name,
        developerName: developer.name,
        qaName: qa.name,
        adminName: adminOwner.name,
        createdByName: creator.name,
        createdAt: coreTickets.createdAt,
        updatedAt: coreTickets.updatedAt,
      })
      .from(coreTickets)
      .leftJoin(projects, eq(coreTickets.projectId, projects.id))
      .leftJoin(modules, eq(coreTickets.moduleId, modules.id))
      .leftJoin(developer, eq(coreTickets.assignedDeveloperId, developer.id))
      .leftJoin(qa, eq(coreTickets.assignedQaId, qa.id))
      .leftJoin(adminOwner, eq(coreTickets.assignedAdminId, adminOwner.id))
      .leftJoin(creator, eq(coreTickets.createdById, creator.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(coreTickets.updatedAt));

    const stats = {
      total: rows.length,
      open: rows.filter((r) => openDevStatuses.includes(r.status as never)).length,
      epic: rows.filter((r) => r.type === "EPIC").length,
      dev: rows.filter((r) => ["ACCEPTED", "DEV_IN_PROGRESS", "DEV_REVIEW"].includes(r.status)).length,
      qa: rows.filter((r) => ["READY_FOR_QA", "QA_IN_PROGRESS"].includes(r.status)).length,
      ready: rows.filter((r) => r.status === "READY_FOR_PRODUCTION").length,
      done: rows.filter((r) => r.status === "DONE").length,
    };

    return ok({ tickets: rows, stats });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser();
    requireCoreRole(session);

    const body = await req.json();
    const { type, priority, title, description, descriptionJson, epicId, parentTaskId, projectId, moduleId } = body;

    if (!title || !description) {
      return NextResponse.json({ message: "Title and description are required" }, { status: 400 });
    }

    if (isEpicType(type) && session.role !== "ADMIN") {
      return NextResponse.json({ message: "Only admins can create EPICs" }, { status: 403 });
    }

    if (type === "SUBTASK" && !parentTaskId) {
      return NextResponse.json({ message: "SUBTASK requires a parent task" }, { status: 400 });
    }

    if (isChildType(type) && type !== "SUBTASK" && !epicId) {
      return NextResponse.json({ message: `${type} requires an EPIC` }, { status: 400 });
    }

    const ticketNo = await nextCoreTicketCode();

    let resolvedEpicId = epicId;
    let resolvedProjectId = projectId;
    let resolvedModuleId = moduleId;

    if (type === "SUBTASK" && parentTaskId) {
      const [parent] = await db
        .select({ epicId: coreTickets.epicId, projectId: coreTickets.projectId, moduleId: coreTickets.moduleId })
        .from(coreTickets)
        .where(eq(coreTickets.id, parentTaskId))
        .limit(1);
      if (parent) {
        resolvedEpicId = parent.epicId;
        if (!resolvedProjectId) resolvedProjectId = parent.projectId;
        if (!resolvedModuleId) resolvedModuleId = parent.moduleId;
      }
    }

    if (resolvedEpicId && !resolvedProjectId) {
      const [epic] = await db
        .select({ projectId: coreTickets.projectId, moduleId: coreTickets.moduleId })
        .from(coreTickets)
        .where(eq(coreTickets.id, resolvedEpicId))
        .limit(1);
      if (epic) {
        if (!resolvedProjectId) resolvedProjectId = epic.projectId;
        if (!resolvedModuleId) resolvedModuleId = epic.moduleId;
      }
    }

    const [ticket] = await db
      .insert(coreTickets)
      .values({
        ticketNo,
        type,
        priority,
        title,
        description,
        descriptionJson,
        epicId: resolvedEpicId,
        parentTaskId,
        projectId: resolvedProjectId,
        moduleId: resolvedModuleId,
        status: isEpicType(type) ? "OPEN" : "NEW",
        createdById: session.id,
      })
      .returning();

    await db.insert(coreTicketActivity).values({
      coreTicketId: ticket.id,
      actorId: session.id,
      type: "ISSUE_CREATED",
      message: `Created ${type} ${ticketNo}`,
    });

    const attachmentPayloads = Array.isArray(body.attachments) ? body.attachments : [];
    for (const item of attachmentPayloads) {
      if (!item?.url?.trim()) continue;
      await db.insert(coreTicketAttachments).values({
        coreTicketId: ticket.id,
        uploadedById: session.id,
        url: item.url,
        publicId: item.url,
        resourceType: "file",
        fileName: item.label || item.url,
        sizeBytes: 0,
      });
    }

    return ok({ ticket }, 201);
  } catch (error) {
    return apiError(error);
  }
}
