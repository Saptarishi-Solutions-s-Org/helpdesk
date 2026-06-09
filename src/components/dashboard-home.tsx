"use client";

import useSWR from "swr";
import { IssuesTable } from "@/components/issues-table";
import { StatCard } from "@/components/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function DashboardHome() {
  const { data } = useSWR("/api/issues", fetcher, { refreshInterval: 15000 });
  const stats = data?.stats ?? { total: 0, open: 0, waiting: 0, closed: 0, reopened: 0 };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Issue Center</h1>
        <p className="text-sm text-muted-foreground">Opened issues, closed issues, and complete history in one clean workspace.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Open" value={stats.open} tone="text-blue-700" />
        <StatCard label="Waiting" value={stats.waiting} tone="text-amber-700" />
        <StatCard label="Closed" value={stats.closed} tone="text-emerald-700" />
        <StatCard label="Reopened" value={stats.reopened} tone="text-red-700" />
      </div>
      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Opened Issues</TabsTrigger>
          <TabsTrigger value="closed">Closed Issues</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="open"><IssuesTable view="open" /></TabsContent>
        <TabsContent value="closed"><IssuesTable view="closed" /></TabsContent>
        <TabsContent value="history"><IssuesTable view="history" /></TabsContent>
      </Tabs>
    </div>
  );
}
