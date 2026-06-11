import { and, eq } from "drizzle-orm";
import { issueActivity, issueStatusHistory, issues, modules, organizationProjects, projects } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyIssueWatchers } from "@/lib/notifications";
import { formatStatus } from "@/lib/utils";

const issueTypes = ["BUG", "CR", "ISSUE", "SERVICE_REQUEST"] as const;
const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "BLOCKER"] as const;

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function displayValue(value: string | null | undefined) {
  return value || "Not assigned";
}

function displayEnum(value: string) {
  return formatStatus(value);
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await context.params;
    const body = await req.json();
    const projectId = clean(body.projectId);
    const moduleId = clean(body.moduleId);
    const type = clean(body.type);
    const priority = clean(body.priority);

    if (!projectId && !moduleId && !type && !priority) {
      return ok({ message: "Select at least one assignment field to update" }, 400);
    }
    if (type && !issueTypes.includes(type as (typeof issueTypes)[number])) {
      return ok({ message: "Select a valid issue type" }, 400);
    }
    if (priority && !priorities.includes(priority as (typeof priorities)[number])) {
      return ok({ message: "Select a valid priority" }, 400);
    }

    const [current] = await db
      .select({
        id: issues.id,
        status: issues.status,
        type: issues.type,
        priority: issues.priority,
        organizationId: issues.organizationId,
        projectId: issues.projectId,
        projectName: projects.name,
        moduleId: issues.moduleId,
        moduleName: modules.name,
      })
      .from(issues)
      .leftJoin(projects, eq(issues.projectId, projects.id))
      .leftJoin(modules, eq(issues.moduleId, modules.id))
      .where(eq(issues.id, id))
      .limit(1);
    if (!current) return ok({ message: "Issue not found" }, 404);

    let nextProjectName = current.projectName;
    let nextModuleName = current.moduleName;
    const updateValues: Partial<typeof issues.$inferInsert> = { updatedAt: new Date() };

    if (type && current.type !== type) {
      updateValues.type = type as typeof issues.$inferInsert.type;
    }
    if (priority && current.priority !== priority) {
      updateValues.priority = priority as typeof issues.$inferInsert.priority;
    }

    if (projectId) {
      const [[nextProject], [linkedProject]] = await Promise.all([
        db.select({ name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1),
        db
          .select({ id: organizationProjects.id })
          .from(organizationProjects)
          .where(and(eq(organizationProjects.organizationId, current.organizationId), eq(organizationProjects.projectId, projectId)))
          .limit(1),
      ]);

      if (!nextProject || !linkedProject) {
        return ok({ message: "Project is not linked to this organization" }, 400);
      }

      nextProjectName = nextProject.name;
      if (current.projectId !== projectId) {
        updateValues.projectId = projectId;
        updateValues.moduleId = null;
        nextModuleName = null;
      }
    }

    const effectiveProjectId = projectId || current.projectId;
    if (moduleId) {
      if (!effectiveProjectId) {
        return ok({ message: "Select a project before selecting a module" }, 400);
      }
      const [nextModule] = await db
        .select({ name: modules.name })
        .from(modules)
        .where(and(eq(modules.id, moduleId), eq(modules.projectId, effectiveProjectId)))
        .limit(1);
      if (!nextModule) {
        return ok({ message: "Module does not belong to the selected project" }, 400);
      }
      nextModuleName = nextModule.name;
      if (current.moduleId !== moduleId) {
        updateValues.moduleId = moduleId;
      }
    }

    const finalType = type || current.type;
    const finalPriority = priority || current.priority;
    const finalProjectId = projectId || current.projectId;
    const finalModuleId = moduleId || (projectId && projectId !== current.projectId ? null : current.moduleId);

    const changes = [
      current.type !== finalType
        ? { field: "Type", from: current.type ? displayEnum(current.type) : "Not assigned", to: finalType ? displayEnum(finalType) : "Not assigned" }
        : null,
      current.priority !== finalPriority
        ? { field: "Priority", from: current.priority ? displayEnum(current.priority) : "Not assigned", to: finalPriority ? displayEnum(finalPriority) : "Not assigned" }
        : null,
      current.projectId !== finalProjectId
        ? { field: "Project", from: displayValue(current.projectName), to: displayValue(nextProjectName) }
        : null,
      current.moduleId !== finalModuleId
        ? { field: "Module", from: displayValue(current.moduleName), to: displayValue(nextModuleName) }
        : null,
    ].filter((change): change is { field: string; from: string; to: string } => Boolean(change));

    if (!changes.length && current.status === "BACKLOG") {
      return ok({ message: "No assignment changes found" }, 400);
    }

    await db
      .update(issues)
      .set({ ...updateValues, status: "BACKLOG" })
      .where(eq(issues.id, id));

    if (current.status !== "BACKLOG") {
      await db.insert(issueStatusHistory).values({
        issueId: id,
        actorId: session.id,
        fromStatus: current.status,
        toStatus: "BACKLOG",
        reason: "Issue moved to backlog",
      });
    }

    const activityRows = changes.length
      ? changes.map((change) => ({
        issueId: id,
        actorId: session.id,
        type: "ISSUE_ASSIGNED",
        message: `${change.field} changed`,
        metadata: change,
      }))
      : [{
        issueId: id,
        actorId: session.id,
        type: "ISSUE_ASSIGNED",
        message: "Moved issue to backlog",
        metadata: { status: "BACKLOG" },
      }];

    await db.insert(issueActivity).values(activityRows);
    await notifyIssueWatchers({
      issueId: id,
      actorId: session.id,
      type: "ISSUE_ASSIGNED",
      title: "Issue assignment updated",
      message: changes.length
        ? changes.map((change) => `${change.field}: ${change.from} to ${change.to}`).join(", ")
        : "Ticket moved to backlog.",
    });
    return ok({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
