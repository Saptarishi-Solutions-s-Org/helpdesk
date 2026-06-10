import { eq } from "drizzle-orm";
import { issueActivity, issueStatusHistory, issues } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyIssueWatchers } from "@/lib/notifications";
import { formatStatus } from "@/lib/utils";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await context.params;
    const { status, reason } = await req.json();
    const current = (await db.select().from(issues).where(eq(issues.id, id)).limit(1))[0];
    if (!current) return ok({ message: "Not found" }, 404);
    await db
      .update(issues)
      .set({
        status,
        closedAt: ["RESOLVED", "CLOSED", "CANCELLED"].includes(status) ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, id));
    await db.insert(issueStatusHistory).values({
      issueId: id,
      actorId: session.id,
      fromStatus: current.status,
      toStatus: status,
      reason,
    });
    await db.insert(issueActivity).values({
      issueId: id,
      actorId: session.id,
      type: "STATUS_CHANGED",
      message: `Status changed from ${formatStatus(current.status)} to ${formatStatus(status)}`,
    });
    await notifyIssueWatchers({
      issueId: id,
      actorId: session.id,
      type: status === "CLOSED" ? "ISSUE_CLOSED" : "STATUS_CHANGED",
      title: "Issue status changed",
      message: `${current.ticketNo} is now ${formatStatus(status)}`,
    });
    return ok({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
