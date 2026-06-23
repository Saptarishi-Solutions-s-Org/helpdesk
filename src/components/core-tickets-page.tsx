"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Code2, Layers, Paperclip, Plus, RotateCcw, ShieldCheck, TicketCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import GlobalLoader from "@/components/commoncomponents/globalloader";
import { RichEditor } from "@/components/rich-editor";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableStateRow } from "@/components/commoncomponents/table-state-row";
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
  projectId?: string | null;
};

type AttachmentDraft = { url: string; label: string };
const emptyAttachment = (): AttachmentDraft => ({ url: "", label: "" });

export function CoreTicketsPage() {
  const router = useRouter();
  const { data: epicsData } = useSWR("/api/core-tickets?type=epic", fetcher);
  const { data: projectsData } = useSWR("/api/admin/projects", fetcher);
  const [view, setView] = useState<"assigned" | "all">("assigned");
  const [createOpen, setCreateOpen] = useState(false);
  const [formType, setFormType] = useState("TASK");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPriority, setFormPriority] = useState("");
  const [formEpicId, setFormEpicId] = useState("");
  const [formParentTaskId, setFormParentTaskId] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([emptyAttachment()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const viewParam = view === "all" ? "" : "?view=assigned";
  const { data, isLoading, mutate } = useSWR(`/api/core-tickets${viewParam}`, fetcher, { refreshInterval: 15000 });

  useRealtime(["core_tickets", "core_ticket_comments", "core_ticket_status_history", "core_ticket_worklogs"], () => {
    void mutate();
  });

  if (isLoading) return <GlobalLoader />;

  const tickets: CoreTicketRow[] = data?.tickets ?? [];
  const stats = data?.stats ?? { total: 0, open: 0, epic: 0, dev: 0, qa: 0, ready: 0, done: 0 };
  const epics: EpicRow[] = epicsData?.tickets ?? [];
  const projects: Array<{ id: string; name: string; code: string }> = projectsData?.projects ?? [];

  const showEpicField = formType !== "EPIC" && formType !== "SUBTASK";
  const showParentTaskField = false;

  const handleEpicChange = (value: string) => {
    setFormEpicId(value);
    const epic = epics.find((e) => e.id === value);
    if (epic) {
      const projectId = (epic as unknown as { projectId?: string }).projectId;
      if (projectId) setFormProjectId(projectId);
    }
  };

  const handleTypeChange = (value: string) => {
    setFormType(value);
    if (value === "SUBTASK") {
      setFormEpicId("");
      setFormParentTaskId("");
    }
  };

  const reset = () => {
    setFormType("TASK");
    setFormTitle("");
    setFormDesc("");
    setFormPriority("");
    setFormEpicId("");
    setFormParentTaskId("");
    setFormProjectId("");
    setAttachments([emptyAttachment()]);
  };

  const updateAttachment = (index: number, key: keyof AttachmentDraft, value: string) => {
    setAttachments((current) => current.map((item, i) => i === index ? { ...item, [key]: value } : item));
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) => current.length === 1 ? [emptyAttachment()] : current.filter((_, i) => i !== index));
  };

  async function handleCreate() {
    if (!formTitle.trim() || !formDesc.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const cleanAttachments = attachments.filter((a) => a.url.trim());
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
          projectId: formProjectId || null,
          attachments: cleanAttachments,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(result.message || "Failed to create"); return; }
      toast.success(`${formType} created successfully`);
      setCreateOpen(false);
      reset();
      void mutate();
      router.push(`/dashboard/core-tickets/${result.ticket.ticketNo}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create");
    } finally {
      setIsSubmitting(false);
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
          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) reset(); }}>
            <DialogTrigger asChild>
              <Button className="w-full rounded-full bg-blue-600 px-6 text-white hover:bg-blue-700 sm:w-auto">
                <Plus className="h-4 w-4" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Core Ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label required className="mb-1">Type</Label>
                    <Select value={formType} onValueChange={handleTypeChange}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TASK">Task</SelectItem>
                        <SelectItem value="IMPROVEMENT">Improvement</SelectItem>
                        <SelectItem value="FEATURE">Feature</SelectItem>
                        <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
                        <SelectItem value="BUG">Bug</SelectItem>
                        <SelectItem value="CR">Change Request</SelectItem>
                        <SelectItem value="EPIC">Epic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="mb-1">Priority</Label>
                    <Select value={formPriority} onValueChange={setFormPriority}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select priority" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                        <SelectItem value="BLOCKER">Blocker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {showEpicField && (
                  <div className="space-y-1">
                    <Label required className="mb-1">EPIC</Label>
                    <Select value={formEpicId} onValueChange={handleEpicChange} required>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select EPIC" /></SelectTrigger>
                      <SelectContent>
                        {epics.map((epic) => (
                          <SelectItem key={epic.id} value={epic.id}>{epic.ticketNo} - {epic.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {showParentTaskField && (
                  <div className="space-y-1">
                    <Label required className="mb-1">Parent Task</Label>
                    <Select value={formParentTaskId} onValueChange={setFormParentTaskId} required>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select parent task" /></SelectTrigger>
                      <SelectContent>
                        {tickets.filter((t) => t.type === "TASK" && (!formEpicId || t.epicId === formEpicId)).map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.ticketNo} - {t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="mb-1">Project</Label>
                  <Select value={formProjectId} onValueChange={setFormProjectId} disabled>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Auto from EPIC" /></SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label required className="mb-1">Title</Label>
                  <Input placeholder="Enter ticket title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label required className="mb-1">Description</Label>
                  <div className="w-full min-w-0">
                    <RichEditor value={formDesc} onChange={setFormDesc} placeholder="Describe the ticket in detail..." compact />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="mb-1">Attachment Links</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setAttachments((current) => [...current, emptyAttachment()])}>
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </div>
                  {attachments.map((attachment, index) => (
                    <div key={index} className="grid gap-2 rounded-lg border bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_auto]">
                      <Input placeholder="Paste Jam, Lightshot, Drive, or reference link" value={attachment.url} onChange={(e) => updateAttachment(index, "url", e.target.value)} />
                      <Input placeholder="Attachment label" value={attachment.label} onChange={(e) => updateAttachment(index, "label", e.target.value)} />
                      <Button type="button" variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => removeAttachment(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5" />
                    Paste public or team-accessible links. They will open in a new tab.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCreate} disabled={isSubmitting} className="bg-blue-500 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
                  {isSubmitting ? "Creating..." : "Create Ticket"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Open" value={stats.open} tone="text-blue-700" />
          <StatCard label="Epics" value={stats.epic} tone="text-purple-700" />
          <StatCard label="Dev" value={stats.dev} tone="text-violet-700" />
          <StatCard label="QA" value={stats.qa} tone="text-amber-700" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="flex items-center gap-3 p-4"><Layers className="h-5 w-5 text-purple-700" /><div><p className="text-sm text-muted-foreground">Epics</p><p className="text-lg font-semibold">{stats.epic}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><Code2 className="h-5 w-5 text-violet-700" /><div><p className="text-sm text-muted-foreground">Development</p><p className="text-lg font-semibold">{stats.dev}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><ShieldCheck className="h-5 w-5 text-amber-700" /><div><p className="text-sm text-muted-foreground">QA</p><p className="text-lg font-semibold">{stats.qa}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><RotateCcw className="h-5 w-5 text-red-700" /><div><p className="text-sm text-muted-foreground">Ready</p><p className="text-lg font-semibold">{stats.ready}</p></div></CardContent></Card>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as "assigned" | "all")}>
          <TabsList className="grid h-10 w-full grid-cols-2">
            <TabsTrigger value="assigned">Assigned</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <TabsContent value="assigned">
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
                        <TableCell className="text-sm font-semibold text-blue-700"><Link href={`/dashboard/core-tickets/${ticket.ticketNo}`}>{ticket.ticketNo}</Link></TableCell>
                        <TableCell>
                          <p className="max-w-[320px] truncate text-sm font-medium text-slate-800">{ticket.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><span>{ticket.projectName || "No project"} / {ticket.moduleName || "No module"}</span>{ticket.priority ? <Badge variant="outline" className={priorityClassName[ticket.priority] ?? "border-slate-200 bg-slate-50 text-slate-600"}>{formatStatus(ticket.priority)}</Badge> : null}</div>
                        </TableCell>
                        <TableCell>{ticket.type ? <Badge variant="outline" className={typeClassName[ticket.type] ?? "border-slate-200 bg-slate-50 text-slate-600"}>{formatStatus(ticket.type)}</Badge> : null}</TableCell>
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
          </TabsContent>
          <TabsContent value="all">
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
                        <TableCell className="text-sm font-semibold text-blue-700"><Link href={`/dashboard/core-tickets/${ticket.ticketNo}`}>{ticket.ticketNo}</Link></TableCell>
                        <TableCell>
                          <p className="max-w-[320px] truncate text-sm font-medium text-slate-800">{ticket.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><span>{ticket.projectName || "No project"} / {ticket.moduleName || "No module"}</span>{ticket.priority ? <Badge variant="outline" className={priorityClassName[ticket.priority] ?? "border-slate-200 bg-slate-50 text-slate-600"}>{formatStatus(ticket.priority)}</Badge> : null}</div>
                        </TableCell>
                        <TableCell>{ticket.type ? <Badge variant="outline" className={typeClassName[ticket.type] ?? "border-slate-200 bg-slate-50 text-slate-600"}>{formatStatus(ticket.type)}</Badge> : null}</TableCell>
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
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
