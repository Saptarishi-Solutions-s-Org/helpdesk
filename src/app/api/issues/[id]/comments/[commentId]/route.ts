import { eq, or } from "drizzle-orm";
import { issueActivity, issueComments, issues } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyIssueWatchers } from "@/lib/notifications";
import { richTextToPlainText } from "@/lib/validators/issue";

const issueLookupFor = (id: string) => {
  const value = decodeURIComponent(id).trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(value)
    ? or(eq(issues.id, value), eq(issues.ticketNo, value))
    : eq(issues.ticketNo, value);
};

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const session = await requireUser();
    const { id, commentId } = await context.params;
    const issue = (await db.select().from(issues).where(issueLookupFor(id)).limit(1))[0];
    if (!issue) return ok({ message: "Not found" }, 404);
    if (!["ADMIN", "CLIENT"].includes(session.role)) throw new Error("FORBIDDEN");
    if (session.role === "CLIENT" && issue.organizationId !== session.organizationId) throw new Error("FORBIDDEN");

    const comment = (await db.select().from(issueComments).where(eq(issueComments.id, commentId)).limit(1))[0];
    if (!comment || comment.issueId !== issue.id) return ok({ message: "Comment not found" }, 404);
    if (comment.authorId !== session.id) throw new Error("FORBIDDEN");

    await db.delete(issueComments).where(eq(issueComments.id, commentId));
    await db.insert(issueActivity).values({
      issueId: issue.id,
      actorId: session.id,
      type: "COMMENT_DELETED",
      message: `${session.name} deleted a comment`,
      metadata: {
        field: "Comment",
        from: richTextToPlainText(comment.body),
        to: "Deleted",
      },
    });
    await notifyIssueWatchers({
      issueId: issue.id,
      actorId: session.id,
      type: "COMMENT_ADDED",
      title: "Comment deleted",
      message: `${session.name} deleted a comment on ${issue.ticketNo}`,
    });

    return ok({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
