import { redirect } from "next/navigation";
import { DashboardHome } from "@/components/dashboard-home";
import { getSessionUser } from "@/lib/auth";

export default async function IssuesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "DEVELOPER" || user.role === "QUALITY ANALYST") redirect("/dashboard/internal-tickets");
  return (
    <main className="min-h-full bg-white p-6">
      <DashboardHome role={user.role} />
    </main>
  );
}
