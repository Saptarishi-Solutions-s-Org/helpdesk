import { redirect } from "next/navigation";
import { CoreTicketsPage } from "@/components/core-tickets-page";
import { getSessionUser } from "@/lib/auth";

export default async function CoreTicketsRoute() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "CLIENT") redirect("/dashboard/issues");
  return <CoreTicketsPage />;
}
