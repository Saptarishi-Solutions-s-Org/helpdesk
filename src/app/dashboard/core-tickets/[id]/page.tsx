import { redirect } from "next/navigation";
import { CoreTicketDetailClient } from "@/components/core-ticket-detail-client";
import { getSessionUser } from "@/lib/auth";

export default async function CoreTicketDetailRoute() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "CLIENT") redirect("/dashboard/issues");
  return <CoreTicketDetailClient />;
}
