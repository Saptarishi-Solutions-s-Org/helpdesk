"use client";

import Link from "next/link";
import useSWR from "swr";
import { Code2, RotateCcw, ShieldCheck, TicketCheck } from "lucide-react";
import GlobalLoader from "@/components/commoncomponents/globalloader";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableStateRow } from "@/components/commoncomponents/table-state-row";
import { useRealtime } from "@/hooks/useRealtime";
import { toIST } from "@/lib/time";
import { formatStatus } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusClassName: Record<string, string> = {
  NEW: "border-sky-100 bg-sky-50 text-sky-700",
  ACCEPTED: "border-blue-100 bg-blue-50 text-blue-700",
  DEV_IN_PROGRESS: "border-violet-100 bg-violet-50 text-violet-700",
  DEV_REVIEW: "border-purple-100 bg-purple-50 text-purple-700",
  READY_FOR_QA: "border-cyan-100 bg-cyan-50 text-cyan-700",
  QA_IN_PROGRESS: "border-amber-100 bg-amber-50 text-amber-700",
  READY_FOR_PRODUCTION: "border-emerald-100 bg-emerald-50 text-emerald-700",
  REOPENED: "border-red-100 bg-red-50 text-red-700",
};

const typeClassName: Record<string, string> = {
  BUG: "border-red-100 bg-red-50 text-red-700",
  CR: "border-cyan-100 bg-cyan-50 text-cyan-700",
  ISSUE: "border-blue-100 bg-blue-50 text-blue-700",
  SERVICE_REQUEST: "border-emerald-100 bg-emerald-50 text-emerald-700",
};

const priorityClassName: Record<string, string> = {
  LOW: "border-slate-200 bg-slate-50 text-slate-600",
  MEDIUM: "border-blue-100 bg-blue-50 text-blue-700",
  HIGH: "border-orange-100 bg-orange-50 text-orange-700",
  CRITICAL: "border-red-100 bg-red-50 text-red-700",
  BLOCKER: "border-red-600 bg-red-600 text-white shadow-sm shadow-red-200",
};

type InternalTicketRow = {
  id: string;
  ticketNo: string;
  parentIssueId: string;
  title: string;
  status: string;
  type: string | null;
  priority: string | null;
  organizationName: string;
  projectName: string | null;
  moduleName: string | null;
  developerName: string | null;
  qaName: string | null;
  updatedAt: string;
};

export function InternalTicketsPage() {
  const { data, isLoading, mutate } = useSWR("/api/internal-tickets", fetcher, { refreshInterval: 15000 });

  useRealtime(["internal_tickets", "internal_ticket_comments", "internal_ticket_status_history", "internal_ticket_worklogs"], () => {
    void mutate();
  });

  if (isLoading) return <GlobalLoader />;

  const tickets: InternalTicketRow[] = data?.tickets ?? [];
  const stats = data?.stats ?? { total: 0, open: 0, new: 0, dev: 0, qa: 0, ready: 0, reopened: 0 };

  return (
    <main className="min-h-full bg-white p-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Internal Tickets</h1>
          <p className="text-sm text-muted-foreground">Support team workflow for cloned SIT tickets.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total SIT" value={stats.total} />
          <StatCard label="Open" value={stats.open} tone="text-blue-700" />
          <StatCard label="Dev" value={stats.dev} tone="text-violet-700" />
          <StatCard label="QA" value={stats.qa} tone="text-amber-700" />
          <StatCard label="Ready" value={stats.ready} tone="text-emerald-700" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="flex items-center gap-3 p-4"><TicketCheck className="h-5 w-5 text-sky-700" /><div><p className="text-sm text-muted-foreground">New</p><p className="text-lg font-semibold">{stats.new}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><Code2 className="h-5 w-5 text-violet-700" /><div><p className="text-sm text-muted-foreground">Development</p><p className="text-lg font-semibold">{stats.dev}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><ShieldCheck className="h-5 w-5 text-amber-700" /><div><p className="text-sm text-muted-foreground">QA</p><p className="text-lg font-semibold">{stats.qa}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><RotateCcw className="h-5 w-5 text-red-700" /><div><p className="text-sm text-muted-foreground">Reopened</p><p className="text-lg font-semibold">{stats.reopened}</p></div></CardContent></Card>
        </div>

        <div className="rounded-lg border bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-[#7677F41A]">
              <TableRow>
                <TableHead>S.No</TableHead>
                <TableHead>SIT Ticket</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignees</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableStateRow colSpan={6} type="empty" emptyMessage="No internal tickets found." />
              ) : (
                tickets.map((ticket, index) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="text-sm font-semibold text-blue-700"><Link href={`/dashboard/internal-tickets/${ticket.ticketNo}`}>{ticket.ticketNo}</Link></TableCell>
                    <TableCell>
                      <p className="max-w-[320px] truncate text-sm font-medium text-slate-800">{ticket.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><span>{ticket.organizationName} - {ticket.projectName || "Not assigned"} / {ticket.moduleName || "Not assigned"}</span>{ticket.type ? <Badge variant="outline" className={typeClassName[ticket.type] ?? "border-slate-200 bg-slate-50 text-slate-600"}>{formatStatus(ticket.type)}</Badge> : null}{ticket.priority ? <Badge variant="outline" className={priorityClassName[ticket.priority] ?? "border-slate-200 bg-slate-50 text-slate-600"}>{formatStatus(ticket.priority)}</Badge> : null}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={statusClassName[ticket.status] ?? "border-slate-200 bg-slate-50"}>{formatStatus(ticket.status)}</Badge></TableCell>
                    <TableCell className="text-sm text-slate-700">
                      <p>Dev: {ticket.developerName || "Not assigned"}</p>
                      <p>QA: {ticket.qaName || "Not assigned"}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{toIST(ticket.updatedAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  );
}

