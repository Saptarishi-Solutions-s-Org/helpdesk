import { eq, or } from "drizzle-orm";
import { issueAttachments, issues } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { attachmentLinkSchema } from "@/lib/validators/issue";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    const value = decodeURIComponent(id).trim();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const issueLookup = uuidPattern.test(value)
      ? or(eq(issues.id, value), eq(issues.ticketNo, value))
      : eq(issues.ticketNo, value);
    const issue = (await db.select().from(issues).where(issueLookup).limit(1))[0];
    if (!issue) return ok({ message: "Not found" }, 404);
    if (!["ADMIN", "CLIENT"].includes(session.role)) throw new Error("FORBIDDEN");
    if (session.role === "CLIENT" && issue.organizationId !== session.organizationId) throw new Error("FORBIDDEN");

    const body = await req.json();
    const rawLinks = Array.isArray(body.attachments) ? body.attachments : [body];
    const attachments: Array<typeof issueAttachments.$inferSelect> = [];

    for (const item of rawLinks) {
      const parsed = attachmentLinkSchema.safeParse(item);
      if (!parsed.success) {
        return ok({ message: parsed.error.issues[0]?.message ?? "Invalid attachment link" }, 400);
      }

      const rows = await db
        .insert(issueAttachments)
        .values({
          issueId: issue.id,
          uploadedById: session.id,
          url: parsed.data.url,
          publicId: parsed.data.url,
          resourceType: "file",
          fileName: parsed.data.label || parsed.data.url,
          sizeBytes: 0,
        })
        .returning();
      attachments.push(rows[0]);
    }

    return ok({ attachments }, 201);
  } catch (error) {
    return apiError(error);
  }
}
