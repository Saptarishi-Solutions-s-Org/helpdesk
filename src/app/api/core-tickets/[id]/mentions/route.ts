import { apiError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getActiveCoreUsers, isCoreRole } from "@/lib/core-tickets";

export async function GET() {
  try {
    const session = await requireUser();
    if (!isCoreRole(session.role)) throw new Error("FORBIDDEN");

    const users = await getActiveCoreUsers();
    return ok({ users });
  } catch (error) {
    return apiError(error);
  }
}
