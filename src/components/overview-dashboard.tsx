"use client";

import Link from "next/link";
import useSWR from "swr";
import { Activity, AlertCircle, CheckCircle2, Clock3, Code2, RotateCcw, Ticket } from "lucide-react";
import GlobalLoader from "@/components/commoncomponents/globalloader";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useRealtime } from "@/hooks/useRealtime";
import { toIST } from "@/lib/time";
import { formatStatus } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
type Role = "ADMIN" | "CLIENT" | "DEVELOPER" | "QUALITY ANALYST";

type TicketRow = {
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

type Stats = Record<string, number> & { total: number };

const shdStatusClassName: Record<string, string> = {
  WAITING_FOR_SUPPORT: "border-sky-100 bg-sky-50 text-sky-700",
  BACKLOG: "border-indigo-100 bg-indigo-50 text-indigo-700",
  IN_ANALYSIS: "border-purple-100 bg-purple-50 text-purple-700",
  IN_PROGRESS: "border-violet-100 bg-violet-50 text-violet-700",
  WAITING_FROM_CLIENT: "border-amber-100 bg-amber-50 text-amber-700",
  QUEUED_FOR_RELEASE: "border-cyan-100 bg-cyan-50 text-cyan-700",
  RESOLVED: "border-emerald-100 bg-emerald-50 text-emerald-700",
  CLOSED: "border-slate-200 bg-slate-50 text-slate-600",
  REOPENED: "border-red-100 bg-red-50 text-red-700",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-500",
};

const sitStatusClassName: Record<string, string> = {
  NEW: "border-sky-100 bg-sky-50 text-sky-700",
  ACCEPTED: "border-blue-100 bg-blue-50 text-blue-700",
  DEV_IN_PROGRESS: "border-violet-100 bg-violet-50 text-violet-700",
  DEV_REVIEW: "border-purple-100 bg-purple-50 text-purple-700",
  READY_FOR_QA: "border-cyan-100 bg-cyan-50 text-cyan-700",
  QA_IN_PROGRESS: "border-amber-100 bg-amber-50 text-amber-700",
  READY_FOR_PRODUCTION: "border-emerald-100 bg-emerald-50 text-emerald-700",
  REOPENED: "border-red-100 bg-red-50 text-red-700",
};

function SummaryItem({ icon: Icon, label, value, tone }: { icon: typeof Ticket; label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${tone}`}><Icon className="h-4 w-4" /></span>
        <span className="truncate text-sm font-medium text-slate-700">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function StatusSplit({ rows, classNameMap }: { rows: TicketRow[]; classNameMap: Record<string, string> }) {
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h2 className="text-base font-semibold text-slate-900">Status Split</h2><p className="text-sm text-muted-foreground">Current lifecycle spread.</p></div>
          <Activity className="h-5 w-5 text-blue-600" />
        </div>
        <div className="space-y-2">
          {Object.entries(counts).length ? Object.entries(counts).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 px-3 py-2">
              <Badge variant="outline" className={classNameMap[status] ?? "border-slate-200 bg-slate-50 text-slate-600"}>{formatStatus(status)}</Badge>
              <span className="text-sm font-semibold text-slate-900">{count}</span>
            </div>
          )) : <p className="rounded-lg border bg-slate-50 p-4 text-center text-sm text-muted-foreground">No tickets yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function LatestMovement({ title, href, rows, classNameMap }: { title: string; href: string; rows: TicketRow[]; classNameMap: Record<string, string> }) {
  const recent = [...rows].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h2 className="text-base font-semibold text-slate-900">{title}</h2><p className="text-sm text-muted-foreground">Recent ticket updates without turning overview into a table.</p></div>
          <Link href={href} className="text-sm font-medium text-blue-700 hover:text-blue-800">View all</Link>
        </div>
        <div className="space-y-2">
          {recent.length ? recent.map((item) => (
            <Link key={item.id} href={`${href}/${item.ticketNo}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50/40">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-blue-700">{item.ticketNo}</span><Badge variant="outline" className={classNameMap[item.status] ?? "border-slate-200 bg-slate-50"}>{formatStatus(item.status)}</Badge></div>
                <p className="mt-1 truncate text-sm font-medium text-slate-800">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.organizationName} - {item.projectName || "Not assigned"} / {item.moduleName || "Not assigned"}</p>
              </div>
              <span className="text-xs text-muted-foreground">{toIST(item.updatedAt)}</span>
            </Link>
          )) : <p className="rounded-lg border bg-slate-50 p-4 text-center text-sm text-muted-foreground">No recent movement yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function ShdSection({ rows, stats }: { rows: TicketRow[]; stats: Stats }) {
  const pending = rows.filter((row) => !row.type || !row.priority || !row.projectName || !row.moduleName).length;
  const assigned = rows.filter((row) => row.projectName && row.moduleName).length;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold text-slate-900">Support Tickets</h2><p className="text-sm text-muted-foreground">Client-facing SHD ticket activity.</p></div><Link href="/dashboard/issues" className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"><Ticket className="h-4 w-4" />Open Issues</Link></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><StatCard label="Total SHD" value={stats.total || 0} /><StatCard label="Open" value={stats.open || 0} tone="text-blue-700" /><StatCard label="Waiting From Client" value={stats.waiting || 0} tone="text-amber-700" /><StatCard label="Closed" value={stats.closed || 0} tone="text-emerald-700" /><StatCard label="Reopened" value={stats.reopened || 0} tone="text-red-700" /></div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"><Card><CardContent className="p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900">Triage Health</h2><p className="text-sm text-muted-foreground">Configured routing and support readiness.</p></div><Ticket className="h-5 w-5 text-blue-600" /></div><div className="grid gap-3 sm:grid-cols-2"><SummaryItem icon={CheckCircle2} label="Assigned to project/module" value={assigned} tone="bg-emerald-50 text-emerald-700" /><SummaryItem icon={AlertCircle} label="Pending triage" value={pending} tone="bg-amber-50 text-amber-700" /><SummaryItem icon={Clock3} label="Waiting From Client" value={stats.waiting || 0} tone="bg-orange-50 text-orange-700" /><SummaryItem icon={RotateCcw} label="Reopened tickets" value={stats.reopened || 0} tone="bg-red-50 text-red-700" /></div></CardContent></Card><StatusSplit rows={rows} classNameMap={shdStatusClassName} /></div>
      <LatestMovement title="Latest SHD Movement" href="/dashboard/issues" rows={rows} classNameMap={shdStatusClassName} />
    </section>
  );
}

function SitSection({ rows, stats }: { rows: TicketRow[]; stats: Stats }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold text-slate-900">Internal Workflow</h2><p className="text-sm text-muted-foreground">SIT tickets handled by support, development, and QA.</p></div><Link href="/dashboard/internal-tickets" className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"><Code2 className="h-4 w-4" />Open Internal</Link></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><StatCard label="Total SIT" value={stats.total || 0} /><StatCard label="Open" value={stats.open || 0} tone="text-blue-700" /><StatCard label="Dev" value={stats.dev || 0} tone="text-violet-700" /><StatCard label="QA" value={stats.qa || 0} tone="text-amber-700" /><StatCard label="Ready" value={stats.ready || 0} tone="text-emerald-700" /></div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"><Card><CardContent className="p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900">Delivery Flow</h2><p className="text-sm text-muted-foreground">Development and QA movement.</p></div><Code2 className="h-5 w-5 text-blue-600" /></div><div className="grid gap-3 sm:grid-cols-2"><SummaryItem icon={Ticket} label="New" value={stats.new || 0} tone="bg-sky-50 text-sky-700" /><SummaryItem icon={Code2} label="Development" value={stats.dev || 0} tone="bg-violet-50 text-violet-700" /><SummaryItem icon={CheckCircle2} label="QA" value={stats.qa || 0} tone="bg-amber-50 text-amber-700" /><SummaryItem icon={RotateCcw} label="Reopened" value={stats.reopened || 0} tone="bg-red-50 text-red-700" /></div></CardContent></Card><StatusSplit rows={rows} classNameMap={sitStatusClassName} /></div>
      <LatestMovement title="Latest SIT Movement" href="/dashboard/internal-tickets" rows={rows} classNameMap={sitStatusClassName} />
    </section>
  );
}

export function OverviewDashboard({ role }: { role: Role }) {
  const loadShd = role === "ADMIN" || role === "CLIENT";
  const loadSit = role === "ADMIN" || role === "DEVELOPER" || role === "QUALITY ANALYST";
  const shd = useSWR(loadShd ? "/api/issues?scope=organization" : null, fetcher, { refreshInterval: 15000 });
  const sit = useSWR(loadSit ? "/api/internal-tickets" : null, fetcher, { refreshInterval: 15000 });

  useRealtime(["issues", "issue_comments", "issue_status_history", "issue_activity"], () => { if (loadShd) void shd.mutate(); });
  useRealtime(["internal_tickets", "internal_ticket_comments", "internal_ticket_status_history", "internal_ticket_worklogs"], () => { if (loadSit) void sit.mutate(); });

  if ((loadShd && shd.isLoading) || (loadSit && sit.isLoading)) return <GlobalLoader />;

  return (
    <main className="min-h-full bg-white p-6">
      <div className="space-y-6">
        <div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Overview</h1><p className="text-sm text-muted-foreground">Track support activity, workflow progress, and resolution trends in one place.</p></div>
        {loadShd ? <ShdSection rows={shd.data?.issues ?? []} stats={shd.data?.stats ?? { total: 0 }} /> : null}
        {loadSit ? <SitSection rows={sit.data?.tickets ?? []} stats={sit.data?.stats ?? { total: 0 }} /> : null}
      </div>
    </main>
  );
}
