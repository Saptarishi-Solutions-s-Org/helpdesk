import { and, eq, inArray } from "drizzle-orm";
import { internalTicketActivity, internalTicketComments, internalTickets, notifications, roles, users } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { internalRoles, isInternalRole, notifyInternalTicket } from "@/lib/internal-tickets";
import { commentSchema, richTextToPlainText } from "@/lib/validators/issue";

function normalizeMention(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    if (!isInternalRole(session.role)) throw new Error("FORBIDDEN");
    const { id } = await context.params;
    const body = await req.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) return ok({ message: parsed.error.issues[0]?.message ?? "Invalid comment" }, 400);

    const [ticket] = await db.select().from(internalTickets).where(eq(internalTickets.id, id)).limit(1);
    if (!ticket) return ok({ message: "Internal ticket not found" }, 404);

    const mentionCandidates = await db
      .select({ id: users.id, name: users.name, email: users.email, roleName: roles.roleName })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.status, "ACTIVE"), inArray(roles.roleName, [...internalRoles])));
    const selectedMentionIds = new Set(parsed.data.mentionedUserIds ?? []);
    const bodyText = normalizeMention(richTextToPlainText(parsed.data.body));
    const mentionedUsers = mentionCandidates.filter((candidate) => {
      if (candidate.id === session.id) return false;
      const hasMentionText = bodyText.includes(`@${normalizeMention(candidate.name)}`);
      return hasMentionText || (selectedMentionIds.has(candidate.id) && hasMentionText);
    });

    const [comment] = await db.insert(internalTicketComments).values({
      internalTicketId: ticket.id,
      authorId: session.id,
      body: parsed.data.body,
      bodyJson: mentionedUsers.length
        ? { mentions: mentionedUsers.map((user) => ({ id: user.id, name: user.name })) }
        : body.bodyJson || null,
    }).returning();

    await db.insert(internalTicketActivity).values({
      internalTicketId: ticket.id,
      actorId: session.id,
      type: "COMMENT_ADDED",
      message: `${session.name} added an internal comment`,
    });
    await notifyInternalTicket({ ticketId: ticket.id, actorId: session.id, title: `${ticket.ticketNo} internal comment`, message: `${session.name} added a comment.` });

    if (mentionedUsers.length) {
      await db.insert(notifications).values(mentionedUsers.map((user) => ({
        recipientId: user.id,
        issueId: null,
        type: "COMMENT_ADDED" as const,
        title: "You were mentioned",
        message: `${session.name} mentioned you in ${ticket.ticketNo}`,
        link: `/dashboard/internal-tickets/${ticket.ticketNo}`,
      })));
    }

    return ok({ comment }, 201);
  } catch (error) {
    return apiError(error);
  }
}
