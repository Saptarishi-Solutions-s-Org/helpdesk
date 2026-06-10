import { eq } from "drizzle-orm";
import { issueActivity, issueStatusHistory, issues, modules, projects } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyIssueWatchers } from "@/lib/notifications";
import { formatStatus } from "@/lib/utils";

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
    const { projectId, moduleId, type, priority } = await req.json();

    if (!projectId || !moduleId || !type || !priority) {
      return ok({ message: "Project, module, type, and priority are required" }, 400);
    }

    const [current] = await db
      .select({
        id: issues.id,
        status: issues.status,
        type: issues.type,
        priority: issues.priority,
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

    const [[nextProject], [nextModule]] = await Promise.all([
      db.select({ name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1),
      db.select({ name: modules.name }).from(modules).where(eq(modules.id, moduleId)).limit(1),
    ]);

    const changes = [
      current.type !== type
        ? { field: "Type", from: current.type ? displayEnum(current.type) : "Not assigned", to: displayEnum(type) }
        : null,
      current.priority !== priority
        ? { field: "Priority", from: current.priority ? displayEnum(current.priority) : "Not assigned", to: displayEnum(priority) }
        : null,
      current.projectId !== projectId
        ? { field: "Project", from: displayValue(current.projectName), to: displayValue(nextProject?.name) }
        : null,
      current.moduleId !== moduleId
        ? { field: "Module", from: displayValue(current.moduleName), to: displayValue(nextModule?.name) }
        : null,
    ].filter((change): change is { field: string; from: string; to: string } => Boolean(change));

    await db
      .update(issues)
      .set({ projectId, moduleId, type, priority, status: "TRIAGED", updatedAt: new Date() })
      .where(eq(issues.id, id));

    if (current.status !== "TRIAGED") {
      await db.insert(issueStatusHistory).values({
        issueId: id,
        actorId: session.id,
        fromStatus: current.status,
        toStatus: "TRIAGED",
        reason: "Issue triaged",
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
        message: "Triaged issue",
        metadata: { projectId, moduleId, type, priority },
      }];

    await db.insert(issueActivity).values(activityRows);
    await notifyIssueWatchers({
      issueId: id,
      actorId: session.id,
      type: "ISSUE_ASSIGNED",
      title: "Issue triaged",
      message: "Project, module, type, and priority have been assigned.",
    });
    return ok({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
