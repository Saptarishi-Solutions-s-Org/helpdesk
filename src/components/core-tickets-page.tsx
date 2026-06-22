"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Code2, Layers, Plus, RotateCcw, ShieldCheck, TicketCheck } from "lucide-react";
import { toast } from "sonner";
import GlobalLoader from "@/components/commoncomponents/globalloader";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableStateRow } from "@/components/commoncomponents/table-state-row";
import { Textarea } from "@/components/ui/textarea";
import { useRealtime } from "@/hooks/useRealtime";
import { toIST } from "@/lib/time";
import { formatStatus } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusClassName: Record<string, string> = {
  OPEN: "border-sky-100 bg-sky-50 text-sky-700",
  IN_PROGRESS: "border-violet-100 bg-violet-50 text-violet-700",
  DONE: "border-emerald-100 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-500",
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
  EPIC: "border-purple-100 bg-purple-50 text-purple-700",
  TASK: "border-blue-100 bg-blue-50 text-blue-700",
  SUBTASK: "border-slate-100 bg-slate-50 text-slate-700",
  IMPROVEMENT: "border-cyan-100 bg-cyan-50 text-cyan-700",
  FEATURE: "border-emerald-100 bg-emerald-50 text-emerald-700",
  DOCUMENTATION: "border-amber-100 bg-amber-50 text-amber-700",
};

const priorityClassName: Record<string, string> = {
  LOW: "border-slate-200 bg-slate-50 text-slate-600",
  MEDIUM: "border-blue-100 bg-blue-50 text-blue-700",
  HIGH: "border-orange-100 bg-orange-50 text-orange-700",
  CRITICAL: "border-red-100 bg-red-50 text-red-700",
  BLOCKER: "border-red-600 bg-red-600 text-white shadow-sm shadow-red-200",
};

type CoreTicketRow = {
  id: string;
  ticketNo: string;
  title: string;
  type: string | null;
  priority: string | null;
  status: string;
  epicId: string | null;
  parentTaskId: string | null;
  projectName: string | null;
  moduleName: string | null;
  developerName: string | null;
  qaName: string | null;
  adminName: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

type EpicRow = {
  id: string;
  ticketNo: string;
  title: string;
};

export function CoreTicketsPage() {
  const { data, isLoading, mutate } = useSWR("/api/core-tickets", fetcher, { refreshInterval: 15000 });
  const { data: epicsData } = useSWR("/api/core-tickets?type=epic", fetcher);
  const [createOpen, setCreateOpen] = useState(false);
  const [formType, setFormType] = useState("TASK");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPriority, setFormPriority] = useState("");
  const [formEpicId, setFormEpicId] = useState("");
  const [formParentTaskId, setFormParentTaskId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useRealtime(["core_tickets", "core_ticket_comments", "core_ticket_status_history", "core_ticket_worklogs"], () => {
    void mutate();
  });

  if (isLoading) return <GlobalLoader />;

  const tickets: CoreTicketRow[] = data?.tickets ?? [];
  const stats = data?.stats ?? { total: 0, open: 0, epic: 0, dev: 0, qa: 0, ready: 0, done: 0 };
  const epics: EpicRow[] = epicsData?.tickets ?? [];

  const showEpicField = formType !== "EPIC" && formType !== "SUBTASK";
  const showParentTaskField = formType === "SUBTASK";

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!formTitle || !formDesc) {
      toast.error("Title and description are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/core-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType,
          priority: formPriority || null,
          title: formTitle,
          description: formDesc,
          epicId: showEpicField ? formEpicId || null : undefined,
          parentTaskId: showParentTaskField ? formParentTaskId || null : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create");
      }
      toast.success(`${formType} created successfully`);
      setCreateOpen(false);
      setFormType("TASK");
      setFormTitle("");
      setFormDesc("");
      setFormPriority("");
      setFormEpicId("");
      setFormParentTaskId("");
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-full bg-white p-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Core Tickets</h1>
            <p className="text-sm text-muted-foreground">Internal dev/QA workflow tickets.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Create Core Ticket</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TASK">Task</SelectItem>
                      <SelectItem value="SUBTASK">Sub Task</SelectItem>
                      <SelectItem value="IMPROVEMENT">Improvement</SelectItem>
                      <SelectItem value="FEATURE">Feature</SelectItem>
                      <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
                      <SelectItem value="EPIC">Epic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formPriority} onValueChange={setFormPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="BLOCKER">Blocker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {showEpicField && (
                  <div className="space-y-2">
                    <Label>EPIC *</Label>
                    <Select value={formEpicId} onValueChange={setFormEpicId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select EPIC" />
                      </SelectTrigger>
                      <SelectContent>
                        {epics.map((epic) => (
                          <SelectItem key={epic.id} value={epic.id}>
                            {epic.ticketNo} - {epic.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {showParentTaskField && (
                  <div className="space-y-2">
                    <Label>Parent Task *</Label>
                    <Select value={formParentTaskId} onValueChange={setFormParentTaskId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent task" />
                      </SelectTrigger>
                      <SelectContent>
                        {tickets
                          .filter((t) => t.type === "TASK" && (!formEpicId || t.epicId === formEpicId))
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.ticketNo} - {t.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} required rows={4} />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Creating..." : "Create"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Open" value={stats.open} tone="text-blue-700" />
          <StatCard label="Epics" value={stats.epic} tone="text-purple-700" />
          <StatCard label="Dev" value={stats.dev} tone="text-violet-700" />
          <StatCard label="QA" value={stats.qa} tone="text-amber-700" />
          <StatCard label="Done" value={stats.done} tone="text-emerald-700" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Layers className="h-5 w-5 text-purple-700" />
              <div>
                <p className="text-sm text-muted-foreground">Epics</p>
                <p className="text-lg font-semibold">{stats.epic}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Code2 className="h-5 w-5 text-violet-700" />
              <div>
                <p className="text-sm text-muted-foreground">Development</p>
                <p className="text-lg font-semibold">{stats.dev}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <ShieldCheck className="h-5 w-5 text-amber-700" />
              <div>
                <p className="text-sm text-muted-foreground">QA</p>
                <p className="text-lg font-semibold">{stats.qa}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <RotateCcw className="h-5 w-5 text-red-700" />
              <div>
                <p className="text-sm text-muted-foreground">Ready for Production</p>
                <p className="text-lg font-semibold">{stats.ready}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-lg border bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-[#7677F41A]">
              <TableRow>
                <TableHead>S.No</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignees</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableStateRow colSpan={7} type="empty" emptyMessage="No core tickets found." />
              ) : (
                tickets.map((ticket, index) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="text-sm font-semibold text-blue-700">
                      <Link href={`/dashboard/core-tickets/${ticket.ticketNo}`}>{ticket.ticketNo}</Link>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[320px] truncate text-sm font-medium text-slate-800">{ticket.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{ticket.projectName || "No project"} / {ticket.moduleName || "No module"}</span>
                        {ticket.priority ? (
                          <Badge variant="outline" className={priorityClassName[ticket.priority] ?? ""}>
                            {formatStatus(ticket.priority)}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {ticket.type ? (
                        <Badge variant="outline" className={typeClassName[ticket.type] ?? ""}>
                          {formatStatus(ticket.type)}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusClassName[ticket.status] ?? ""}>
                        {formatStatus(ticket.status)}
                      </Badge>
                    </TableCell>
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
