import { eq, or } from "drizzle-orm";
import { issueActivity, issueComments, issues } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyIssueWatchers } from "@/lib/notifications";
import { commentSchema } from "@/lib/validators/issue";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    const payload = await req.json();
    const parsed = commentSchema.safeParse(payload);

    if (!parsed.success) {
      return ok({ message: parsed.error.issues[0]?.message ?? "Invalid comment" }, 400);
    }

    const value = decodeURIComponent(id).trim();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const issueLookup = uuidPattern.test(value)
      ? or(eq(issues.id, value), eq(issues.ticketNo, value))
      : eq(issues.ticketNo, value);
    const issue = (await db.select().from(issues).where(issueLookup).limit(1))[0];
    if (!issue) return ok({ message: "Not found" }, 404);
    if (session.role === "USER" && issue.reporterId !== session.id) throw new Error("FORBIDDEN");
    const rows = await db
      .insert(issueComments)
      .values({
        issueId: issue.id,
        authorId: session.id,
        body: parsed.data.body,
        bodyJson: parsed.data.attachmentUrl
          ? {
              attachment: {
                url: parsed.data.attachmentUrl,
                label: parsed.data.attachmentLabel || parsed.data.attachmentUrl,
              },
            }
          : null,
      })
      .returning();

    await db.insert(issueActivity).values({
      issueId: issue.id,
      actorId: session.id,
      type: "COMMENT_ADDED",
      message: `${session.name} added a comment`,
      metadata: parsed.data.attachmentUrl
        ? { attachment: parsed.data.attachmentLabel || parsed.data.attachmentUrl }
        : null,
    });
    await notifyIssueWatchers({
      issueId: issue.id,
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
