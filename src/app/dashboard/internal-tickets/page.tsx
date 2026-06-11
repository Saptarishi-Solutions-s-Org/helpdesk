import { redirect } from "next/navigation";
import { InternalTicketsPage } from "@/components/internal-tickets-page";
import { getSessionUser } from "@/lib/auth";

export default async function InternalTicketsRoute() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "CLIENT") redirect("/dashboard/issues");
  return <InternalTicketsPage />;
}
