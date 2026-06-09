"use client";

import Link from "next/link";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatStatus } from "@/lib/utils";
import { useRealtime } from "@/hooks/useRealtime";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type IssueRow = {
  id: string;
  ticketNo: string;
  title: string;
  organizationName: string;
  type: string;
  status: string;
  projectName?: string | null;
  moduleName?: string | null;
  updatedAt: string;
};

export function IssuesTable({ view }: { view?: "open" | "closed" | "history" }) {
  const { data, isLoading, mutate } = useSWR(`/api/issues${view && view !== "history" ? `?view=${view}` : ""}`, fetcher, {
    refreshInterval: 15000,
  });
  useRealtime(["issues", "issue_comments", "issue_status_history"], () => {
    void mutate();
  });

  if (isLoading) return <Card className="p-6 text-sm text-muted-foreground">Loading issues...</Card>;

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Project / Module</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data?.issues ?? []).map((issue: IssueRow) => (
            <TableRow key={issue.id}>
              <TableCell className="font-semibold text-blue-700">
                <Link href={`/dashboard/issues/${issue.id}`}>{issue.ticketNo}</Link>
              </TableCell>
              <TableCell>
                <p className="font-medium">{issue.title}</p>
                <p className="text-xs text-muted-foreground">{issue.organizationName}</p>
              </TableCell>
              <TableCell><Badge variant="outline">{issue.type}</Badge></TableCell>
              <TableCell><Badge variant="secondary">{formatStatus(issue.status)}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {issue.projectName || "Unassigned"} / {issue.moduleName || "Unassigned"}
              </TableCell>
              <TableCell>{new Date(issue.updatedAt).toLocaleString("en-IN")}</TableCell>
            </TableRow>
          ))}
          {(data?.issues ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                No issues in this view
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
