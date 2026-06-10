import { and, eq, or } from "drizzle-orm";
import { issueActivity, issueComments, issues, notifications, roles, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyIssueWatchers } from "@/lib/notifications";
import { commentSchema, richTextToPlainText } from "@/lib/validators/issue";

function normalizeMention(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

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
    if (session.role === "USER" && issue.organizationId !== session.organizationId) throw new Error("FORBIDDEN");

    const mentionCandidates = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        roleName: roles.roleName,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(
        and(
          eq(users.status, "ACTIVE"),
          or(eq(users.organizationId, issue.organizationId), eq(roles.roleName, "ADMIN")),
        ),
      );
    const selectedMentionIds = new Set(parsed.data.mentionedUserIds ?? []);
    const bodyText = normalizeMention(richTextToPlainText(parsed.data.body));
    const mentionedUsers = mentionCandidates.filter((candidate) => {
      if (candidate.id === session.id) return false;
      const hasMentionText = bodyText.includes(`@${normalizeMention(candidate.name)}`);
      return hasMentionText || (selectedMentionIds.has(candidate.id) && hasMentionText);
    });

    const rows = await db
      .insert(issueComments)
      .values({
        issueId: issue.id,
        authorId: session.id,
        body: parsed.data.body,
        bodyJson:
          parsed.data.attachmentUrl || mentionedUsers.length
            ? {
              mentions: mentionedUsers.map((user) => ({ id: user.id, name: user.name })),
              ...(parsed.data.attachmentUrl
                ? {
              attachment: {
                url: parsed.data.attachmentUrl,
                label: parsed.data.attachmentLabel || parsed.data.attachmentUrl,
              },
                  }
                : {}),
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

    const mentionNotifications = mentionedUsers.map((user) => ({
      recipientId: user.id,
      issueId: issue.id,
      type: "COMMENT_ADDED" as const,
      title: "You were mentioned",
      message: `${session.name} mentioned you in ${issue.ticketNo}`,
      link: `/dashboard/issues/${issue.ticketNo}`,
    }));
    if (mentionNotifications.length) {
      await db.insert(notifications).values(mentionNotifications);
    }

    return ok({ comment: rows[0] }, 201);
  } catch (error) {
    return apiError(error);
  }
}
