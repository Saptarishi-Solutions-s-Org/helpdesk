import { eq } from "drizzle-orm";
import { issueActivity, issues } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyIssueWatchers } from "@/lib/notifications";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await context.params;
    const { projectId, moduleId, type, priority } = await req.json();

    if (!projectId || !moduleId || !type || !priority) {
      return ok({ message: "Project, module, type, and priority are required" }, 400);
    }

    await db
      .update(issues)
      .set({ projectId, moduleId, type, priority, status: "TRIAGED", updatedAt: new Date() })
      .where(eq(issues.id, id));
    await db.insert(issueActivity).values({
      issueId: id,
      actorId: session.id,
      type: "ISSUE_ASSIGNED",
      message: "Triaged issue",
      metadata: { projectId, moduleId, type, priority },
    });
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
