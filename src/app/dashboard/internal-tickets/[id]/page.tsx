import { redirect } from "next/navigation";
import { InternalTicketDetailClient } from "@/components/internal-ticket-detail-client";
import { getSessionUser } from "@/lib/auth";

export default async function InternalTicketDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "CLIENT") redirect("/dashboard/issues");
  const { id } = await params;
  return <InternalTicketDetailClient id={id} role={user.role} />;
}
