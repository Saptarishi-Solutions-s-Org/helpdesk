"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { useRealtime } from "@/hooks/useRealtime";
import { IssuesTable } from "@/components/issues-table";
import { NewIssueForm } from "@/components/new-issue-form";
import { StatCard } from "@/components/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function DashboardHome({ role }: { role: "ADMIN" | "CLIENT" | "DEVELOPER" | "QUALITY ANALYST" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "closed" ? "closed" : "open";
  const { data, mutate } = useSWR("/api/issues", fetcher, { refreshInterval: 15000 });
  const canCreateIssue = role === "ADMIN" || role === "CLIENT";
  const stats = data?.stats ?? { total: 0, open: 0, waiting: 0, closed: 0, reopened: 0 };

  useRealtime(["issues", "issue_comments", "issue_status_history"], () => {
    void mutate();
  });

  const updateTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Issue Center</h1>
          <p className="text-sm text-muted-foreground">
            {role === "CLIENT"
              ? "Track support issues raised by your organization. You can comment and update ticket details from the issue page."
              : "Track opened and closed support issues across organizations."}
          </p>
        </div>
        {canCreateIssue ? <NewIssueForm role={role === "ADMIN" ? "ADMIN" : "CLIENT"} onCreated={() => void mutate()} /> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Open" value={stats.open} tone="text-blue-700" />
        <StatCard label="Waiting From Client" value={stats.waiting} tone="text-amber-700" />
        <StatCard label="Closed" value={stats.closed} tone="text-emerald-700" />
        <StatCard label="Reopened" value={stats.reopened} tone="text-red-700" />
      </div>
      <Tabs value={activeTab} onValueChange={updateTab}>
        <TabsList className="grid h-10 w-full grid-cols-2">
          <TabsTrigger value="open">Opened Issues</TabsTrigger>
          <TabsTrigger value="closed">Closed Issues</TabsTrigger>
        </TabsList>
        <TabsContent value="open"><IssuesTable view="open" /></TabsContent>
        <TabsContent value="closed"><IssuesTable view="closed" /></TabsContent>
      </Tabs>
    </div>
  );
}
