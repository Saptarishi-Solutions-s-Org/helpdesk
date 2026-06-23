import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { coreTicketActivity, coreTicketLinks, coreTickets } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCoreRole, requireCoreRole } from "@/lib/core-tickets";

const linkSource = alias(coreTickets, "link_source_ticket");
const linkTarget = alias(coreTickets, "link_target_ticket");

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    if (!isCoreRole(session.role)) throw new Error("FORBIDDEN");
    const { id } = await context.params;

    const links = await db
      .select({
        id: coreTicketLinks.id,
        linkType: coreTicketLinks.linkType,
        sourceTicketId: coreTicketLinks.sourceTicketId,
        sourceTicketNo: linkSource.ticketNo,
        sourceTitle: linkSource.title,
        targetTicketId: coreTicketLinks.targetTicketId,
        targetTicketNo: linkTarget.ticketNo,
        targetTitle: linkTarget.title,
        createdAt: coreTicketLinks.createdAt,
      })
      .from(coreTicketLinks)
      .leftJoin(linkSource, eq(coreTicketLinks.sourceTicketId, linkSource.id))
      .leftJoin(linkTarget, eq(coreTicketLinks.targetTicketId, linkTarget.id))
      .where(or(eq(coreTicketLinks.sourceTicketId, id), eq(coreTicketLinks.targetTicketId, id)))
      .orderBy(coreTicketLinks.createdAt);

    return ok({ links });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    requireCoreRole(session);
    const { id } = await context.params;

    const body = await req.json();
    const { targetTicketNo, linkType } = body;

    if (!targetTicketNo || !linkType) {
      return NextResponse.json({ message: "targetTicketNo and linkType are required" }, { status: 400 });
    }

    const [targetTicket] = await db
      .select({ id: coreTickets.id })
      .from(coreTickets)
      .where(eq(coreTickets.ticketNo, targetTicketNo))
      .limit(1);

    if (!targetTicket) {
      return NextResponse.json({ message: `Ticket ${targetTicketNo} not found` }, { status: 404 });
    }

    const targetTicketId = targetTicket.id;

    const [existing] = await db
      .select({ id: coreTicketLinks.id })
      .from(coreTicketLinks)
      .where(
        and(
          or(
            and(eq(coreTicketLinks.sourceTicketId, id), eq(coreTicketLinks.targetTicketId, targetTicketId)),
            and(eq(coreTicketLinks.sourceTicketId, targetTicketId), eq(coreTicketLinks.targetTicketId, id)),
          ),
          eq(coreTicketLinks.linkType, linkType),
        ),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json({ message: "Link already exists" }, { status: 409 });
    }

    const [link] = await db
      .insert(coreTicketLinks)
      .values({ sourceTicketId: id, targetTicketId, linkType })
      .returning();

    await db.insert(coreTicketActivity).values({
      coreTicketId: id,
      actorId: session.id,
      type: "LINK_ADDED",
      message: `Linked to ticket with relation ${linkType}`,
    });

    return ok({ link }, 201);
  } catch (error) {
    return apiError(error);
  }
}
