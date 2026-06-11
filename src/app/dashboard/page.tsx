import { redirect } from "next/navigation";
import { OverviewDashboard } from "@/components/overview-dashboard";
import { getSessionUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <OverviewDashboard role={user.role} />;
}
