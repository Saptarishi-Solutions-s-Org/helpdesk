"use client";

import Link from "next/link";
import useSWR from "swr";
import { Activity, AlertCircle, CheckCircle2, Clock3, FolderKanban, RotateCcw, Ticket } from "lucide-react";
import GlobalLoader from "@/components/commoncomponents/globalloader";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useRealtime } from "@/hooks/useRealtime";
import { toIST } from "@/lib/time";
import { formatStatus } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type IssueRow = {
  id: string;
  ticketNo: string;
  title: string;
  status: string;
  type: string | null;
  priority: string | null;
  organizationName: string;
  projectName: string | null;
  moduleName: string | null;
  updatedAt: string;
};

type DashboardStats = {
  total: number;
  open: number;
  waiting: number;
  closed: number;
  reopened: number;
};

const statusClassName: Record<string, string> = {
  OPEN: "border-blue-100 bg-blue-50 text-blue-700",
  TRIAGED: "border-indigo-100 bg-indigo-50 text-indigo-700",
  IN_PROGRESS: "border-violet-100 bg-violet-50 text-violet-700",
  WAITING_FROM_CLIENT: "border-amber-100 bg-amber-50 text-amber-700",
  RESOLVED: "border-emerald-100 bg-emerald-50 text-emerald-700",
  CLOSED: "border-slate-200 bg-slate-50 text-slate-600",
  REOPENED: "border-red-100 bg-red-50 text-red-700",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-500",
};

function SummaryItem({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Ticket;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${tone}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate text-sm font-medium text-slate-700">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

export function OverviewDashboard() {
  const { data, isLoading, mutate } = useSWR("/api/issues?scope=organization", fetcher, {
    refreshInterval: 15000,
  });

  useRealtime(["issues", "issue_comments", "issue_status_history", "issue_activity"], () => {
    void mutate();
  });

  if (isLoading) return <GlobalLoader />;

  const issues: IssueRow[] = data?.issues ?? [];
  const stats: DashboardStats = data?.stats ?? { total: 0, open: 0, waiting: 0, closed: 0, reopened: 0 };
  const untriaged = issues.filter((issue) => !issue.type || !issue.priority || !issue.projectName || !issue.moduleName).length;
  const assigned = issues.filter((issue) => issue.projectName && issue.moduleName).length;
  const recent = [...issues]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  const statusCounts = issues.reduce<Record<string, number>>((acc, issue) => {
    acc[issue.status] = (acc[issue.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-full bg-white p-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Overview</h1>
            <p className="text-sm text-muted-foreground">
              Track support activity, ticket progress, and resolution trends in one place.
            </p>
          </div>
          <Link
            href="/dashboard/issues"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Ticket className="h-4 w-4" />
            Open Issues
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total Issues" value={stats.total} />
          <StatCard label="Open" value={stats.open} tone="text-blue-700" />
          <StatCard label="Waiting From Client" value={stats.waiting} tone="text-amber-700" />
          <StatCard label="Closed" value={stats.closed} tone="text-emerald-700" />
          <StatCard label="Reopened" value={stats.reopened} tone="text-red-700" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Triage Health</h2>
                  <p className="text-sm text-muted-foreground">Configured routing and support readiness.</p>
                </div>
                <FolderKanban className="h-5 w-5 text-blue-600" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryItem icon={CheckCircle2} label="Assigned to project/module" value={assigned} tone="bg-emerald-50 text-emerald-700" />
                <SummaryItem icon={AlertCircle} label="Pending triage" value={untriaged} tone="bg-amber-50 text-amber-700" />
                <SummaryItem icon={Clock3} label="Waiting From Client" value={stats.waiting} tone="bg-orange-50 text-orange-700" />
                <SummaryItem icon={RotateCcw} label="Reopened tickets" value={stats.reopened} tone="bg-red-50 text-red-700" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Status Split</h2>
                  <p className="text-sm text-muted-foreground">Current lifecycle spread.</p>
                </div>
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div className="space-y-2">
                {Object.entries(statusCounts).length ? (
                  Object.entries(statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 px-3 py-2">
                      <Badge variant="outline" className={statusClassName[status] ?? "border-slate-200 bg-slate-50 text-slate-600"}>
                        {formatStatus(status)}
                      </Badge>
                      <span className="text-sm font-semibold text-slate-900">{count}</span>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border bg-slate-50 p-4 text-center text-sm text-muted-foreground">
                    No issues yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Latest Movement</h2>
                <p className="text-sm text-muted-foreground">Recent ticket updates without turning overview into a table.</p>
              </div>
              <Link href="/dashboard/issues" className="text-sm font-medium text-blue-700 hover:text-blue-800">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {recent.length ? (
                recent.map((issue) => (
                  <Link
                    key={issue.id}
                    href={`/dashboard/issues/${issue.ticketNo}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-blue-700">{issue.ticketNo}</span>
                        <Badge variant="outline" className={statusClassName[issue.status] ?? "border-slate-200 bg-slate-50 text-slate-600"}>
                          {formatStatus(issue.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-slate-800">{issue.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {issue.organizationName} - {issue.projectName || "Not assigned"} / {issue.moduleName || "Not assigned"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{toIST(issue.updatedAt)}</span>
                  </Link>
                ))
              ) : (
                <p className="rounded-lg border bg-slate-50 p-4 text-center text-sm text-muted-foreground">
                  No recent movement yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
