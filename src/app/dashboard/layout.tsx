import { DashboardShell } from "@/components/dashboard-shell";
import { getSessionUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <DashboardShell
      user={
        user ?? {
          id: "",
          name: "SRS Helpdesk",
          email: "",
          role: "USER",
          organizationId: null,
        }
      }
    >
      {children}
    </DashboardShell>
  );
}
