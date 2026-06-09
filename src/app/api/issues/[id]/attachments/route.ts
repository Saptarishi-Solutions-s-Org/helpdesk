import { eq } from "drizzle-orm";
import { issueAttachments, issues } from "@/db/schema";
import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { uploadHelpdeskFile } from "@/lib/cloudinary";
import { db } from "@/lib/db";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    const issue = (await db.select().from(issues).where(eq(issues.id, id)).limit(1))[0];
    if (!issue) return ok({ message: "Not found" }, 404);
    if (session.role === "USER" && issue.reporterId !== session.id) throw new Error("FORBIDDEN");

    const form = await req.formData();
    const files = form.getAll("files").filter((file): file is File => file instanceof File);
    const uploaded = [];
    for (const file of files) {
      const result = await uploadHelpdeskFile(file, `${issue.organizationId}/${id}`);
      const rows = await db
        .insert(issueAttachments)
        .values({
          issueId: id,
          uploadedById: session.id,
          url: result.url,
          publicId: result.publicId,
          resourceType: result.resourceType,
          fileName: file.name,
          sizeBytes: file.size,
        })
        .returning();
      uploaded.push(rows[0]);
    }
    return ok({ attachments: uploaded }, 201);
  } catch (error) {
    return apiError(error);
  }
}
