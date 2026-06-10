import { eq, or } from "drizzle-orm";
import { issueActivity, issueAttachments, issues } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyIssueWatchers } from "@/lib/notifications";

const issueLookupFor = (id: string) => {
  const value = decodeURIComponent(id).trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
  return uuidPattern.test(value)
    ? or(eq(issues.id, value), eq(issues.ticketNo, value))
    : eq(issues.ticketNo, value);
};

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> },
) {
  try {
    const session = await requireUser();
    const { id, attachmentId } = await context.params;
    const issue = (await db.select().from(issues).where(issueLookupFor(id)).limit(1))[0];
    if (!issue) return ok({ message: "Not found" }, 404);
    if (session.role === "USER" && issue.organizationId !== session.organizationId) throw new Error("FORBIDDEN");

    const attachment = (await db
      .select()
      .from(issueAttachments)
      .where(eq(issueAttachments.id, attachmentId))
      .limit(1))[0];
    if (!attachment || attachment.issueId !== issue.id) {
      return ok({ message: "Attachment not found" }, 404);
    }

    await db.delete(issueAttachments).where(eq(issueAttachments.id, attachmentId));
    await db.insert(issueActivity).values({
      issueId: issue.id,
      actorId: session.id,
      type: "ISSUE_UPDATED",
      message: "Attachment removed",
      metadata: {
        field: "Attachment",
        from: attachment.fileName || attachment.url,
        to: "Removed",
      },
    });
    await notifyIssueWatchers({
      issueId: issue.id,
      actorId: session.id,
      type: "STATUS_CHANGED",
      title: "Issue updated",
      message: `${session.name} removed an attachment from ${issue.ticketNo}`,
    });

    return ok({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
