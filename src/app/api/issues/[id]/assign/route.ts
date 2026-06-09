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
    const { projectId, moduleId } = await req.json();
    await db
      .update(issues)
      .set({ projectId, moduleId, status: "TRIAGED", updatedAt: new Date() })
      .where(eq(issues.id, id));
    await db.insert(issueActivity).values({
      issueId: id,
      actorId: session.id,
      type: "ISSUE_ASSIGNED",
      message: "Assigned project and module",
      metadata: { projectId, moduleId },
    });
    await notifyIssueWatchers({
      issueId: id,
      actorId: session.id,
      type: "ISSUE_ASSIGNED",
      title: "Issue assigned",
      message: "Project and module have been assigned.",
    });
    return ok({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
