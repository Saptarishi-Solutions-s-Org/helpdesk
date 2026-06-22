import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { coreTicketActivity, coreTicketWorklogs, coreTickets } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCoreRole, requireCoreRole } from "@/lib/core-tickets";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    requireCoreRole(session);
    const { id } = await context.params;

    const body = await req.json();
    const { note } = body;

    const [activeWorklog] = await db
      .select({ id: coreTicketWorklogs.id, startedAt: coreTicketWorklogs.startedAt })
      .from(coreTicketWorklogs)
      .where(and(eq(coreTicketWorklogs.coreTicketId, id), eq(coreTicketWorklogs.workerId, session.id), isNull(coreTicketWorklogs.stoppedAt)))
      .limit(1);

    if (!activeWorklog) {
      return NextResponse.json({ message: "No active worklog found" }, { status: 400 });
    }

    const now = new Date();
    const durationMinutes = Math.round((now.getTime() - new Date(activeWorklog.startedAt).getTime()) / 60000);

    const [worklog] = await db
      .update(coreTicketWorklogs)
      .set({ stoppedAt: now, durationMinutes, note, updatedAt: now })
      .where(eq(coreTicketWorklogs.id, activeWorklog.id))
      .returning();

    await db.insert(coreTicketActivity).values({
      coreTicketId: id,
      actorId: session.id,
      type: "WORKLOG_STOPPED",
      message: `Work stopped after ${durationMinutes} minutes`,
    });

    return ok({ worklog });
  } catch (error) {
    return apiError(error);
  }
}
