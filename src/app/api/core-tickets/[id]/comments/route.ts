import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { coreTicketActivity, coreTicketComments } from "@/db/schema";
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
    const { body: commentBody, bodyJson } = body;
    if (!commentBody) {
      return NextResponse.json({ message: "Comment body is required" }, { status: 400 });
    }

    const [comment] = await db
      .insert(coreTicketComments)
      .values({
        coreTicketId: id,
        authorId: session.id,
        body: commentBody,
        bodyJson,
      })
      .returning();

    await db.insert(coreTicketActivity).values({
      coreTicketId: id,
      actorId: session.id,
      type: "COMMENT_ADDED",
      message: "Comment added",
    });

    return ok({ comment }, 201);
  } catch (error) {
    return apiError(error);
  }
}
