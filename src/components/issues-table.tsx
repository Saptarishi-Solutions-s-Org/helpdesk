"use client";

import Link from "next/link";
import useSWR from "swr";
import { useRealtime } from "@/hooks/useRealtime";
import GlobalLoader from "@/components/commoncomponents/globalloader";
import { TableStateRow } from "@/components/commoncomponents/table-state-row";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatStatus } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type IssueRow = {
  id: string;
  ticketNo: string;
  title: string;
  organizationName: string;
  status: string;
  projectName?: string | null;
  moduleName?: string | null;
};

const statusClassName: Record<string, string> = {
  OPEN: "border-blue-100 bg-blue-50 text-blue-700",
  TRIAGED: "border-indigo-100 bg-indigo-50 text-indigo-700",
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

export function IssuesTable({ view }: { view?: "open" | "closed" }) {
  const endpoint = `/api/issues${view ? `?view=${view}` : ""}`;
  const { data, isLoading, mutate } = useSWR(endpoint, fetcher, {
    refreshInterval: 15000,
  });

  useRealtime(["issues", "issue_comments", "issue_status_history"], () => {
    void mutate();
  });

  const rows: IssueRow[] = data?.issues ?? [];

  if (isLoading) return <GlobalLoader />;

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <Table>
        <TableHeader className="bg-[#7677F41A]">
          <TableRow>
            <TableHead className="text-xs sm:text-sm">S.No</TableHead>
            <TableHead className="text-xs sm:text-sm">Ticket</TableHead>
            <TableHead className="text-xs sm:text-sm">Issue</TableHead>
            <TableHead className="text-xs sm:text-sm">Status</TableHead>
            <TableHead className="text-xs sm:text-sm">Project / Module</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableStateRow colSpan={5} type="empty" emptyMessage="No issues found." />
          ) : (
            rows.map((issue, index) => (
              <TableRow key={issue.id}>
                <TableCell className="text-xs text-gray-600 sm:text-sm">
                  {index + 1}
                </TableCell>
                <TableCell className="text-xs font-semibold text-blue-700 sm:text-sm">
                  <Link href={`/dashboard/issues/${issue.ticketNo}`}>{issue.ticketNo}</Link>
                </TableCell>
                <TableCell>
                  <p className="max-w-[320px] truncate text-xs font-medium text-gray-800 sm:text-sm">
                    {issue.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{issue.organizationName}</p>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusClassName[issue.status] ?? "border-slate-200 bg-slate-50 text-slate-600"}
                  >
                    {formatStatus(issue.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-gray-600 sm:text-sm">
                  {issue.projectName || "Not assigned"} / {issue.moduleName || "Not assigned"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}


