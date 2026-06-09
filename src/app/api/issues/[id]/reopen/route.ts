import { eq, sql } from "drizzle-orm";
import { issueActivity, issueStatusHistory, issues } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyIssueWatchers } from "@/lib/notifications";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    const { reason } = await req.json();
    const current = (await db.select().from(issues).where(eq(issues.id, id)).limit(1))[0];
    if (!current) return ok({ message: "Not found" }, 404);
    if (session.role === "USER" && current.reporterId !== session.id) throw new Error("FORBIDDEN");
    await db
      .update(issues)
      .set({
        status: "REOPENED",
        reopenedCount: sql`${issues.reopenedCount} + 1`,
        closedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, id));
    await db.insert(issueStatusHistory).values({
      issueId: id,
      actorId: session.id,
      fromStatus: current.status,
      toStatus: "REOPENED",
      reason,
    });
    await db.insert(issueActivity).values({
      issueId: id,
      actorId: session.id,
      type: "ISSUE_REOPENED",
      message: `${session.name} reopened the issue`,
    });
    await notifyIssueWatchers({
      issueId: id,
      actorId: session.id,
      type: "ISSUE_REOPENED",
      title: "Issue reopened",
      message: `${current.ticketNo} has been reopened.`,
    });
    return ok({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
