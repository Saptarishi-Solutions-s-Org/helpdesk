import { DashboardHome } from "@/components/dashboard-home";
import { NewIssueForm } from "@/components/new-issue-form";
import { getSessionUser } from "@/lib/auth";

export default async function IssuesPage() {
  const user = await getSessionUser();
  return (
    <div className="space-y-6">
      {user?.role === "USER" && <NewIssueForm />}
      <DashboardHome />
    </div>
  );
}
