import { eq } from "drizzle-orm";
import { issueActivity, issueComments, issues } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyIssueWatchers } from "@/lib/notifications";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    const { body } = await req.json();
    const issue = (await db.select().from(issues).where(eq(issues.id, id)).limit(1))[0];
    if (!issue) return ok({ message: "Not found" }, 404);
    if (session.role === "USER" && issue.reporterId !== session.id) throw new Error("FORBIDDEN");
    const rows = await db
      .insert(issueComments)
      .values({ issueId: id, authorId: session.id, body })
      .returning();
    await db.insert(issueActivity).values({
      issueId: id,
      actorId: session.id,
      type: "COMMENT_ADDED",
      message: `${session.name} added a comment`,
    });
    await notifyIssueWatchers({
      issueId: id,
      actorId: session.id,
      type: "COMMENT_ADDED",
      title: "New comment",
      message: `${session.name} commented on ${issue.ticketNo}`,
    });
    return ok({ comment: rows[0] }, 201);
  } catch (error) {
    return apiError(error);
  }
}
