import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { issues, notifications, roles, users } from "@/db/schema";

type NotificationType =
  | "ISSUE_CREATED"
  | "ISSUE_ASSIGNED"
  | "COMMENT_ADDED"
  | "STATUS_CHANGED"
  | "ISSUE_CLOSED"
  | "ISSUE_REOPENED";

export async function notifyIssueWatchers({
  issueId,
  actorId,
  type,
  title,
  message,
}: {
  issueId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  message: string;
}) {
  const issueRows = await db
    .select({
      id: issues.id,
      reporterId: issues.reporterId,
      organizationId: issues.organizationId,
      ticketNo: issues.ticketNo,
    })
    .from(issues)
    .where(eq(issues.id, issueId))
    .limit(1);

  const issue = issueRows[0];
  if (!issue) return;

  const adminRows = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(roles.roleName, "ADMIN"));

  const recipients = new Set<string>([issue.reporterId]);
  for (const row of adminRows) recipients.add(row.id);
  if (actorId) recipients.delete(actorId);

  const values = Array.from(recipients).map((recipientId) => ({
    recipientId,
    issueId,
    type,
    title,
    message,
    link: `/dashboard/issues/${issueId}`,
  }));

  if (values.length) await db.insert(notifications).values(values);
}
