import { DashboardHome } from "@/components/dashboard-home";
import { getSessionUser } from "@/lib/auth";

export default async function IssuesPage() {
  const user = await getSessionUser();
  return (
    <main className="min-h-full bg-white p-6">
      <DashboardHome role={user?.role ?? "CLIENT"} />
    </main>
  );
}
