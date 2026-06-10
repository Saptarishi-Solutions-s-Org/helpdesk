"use client";

import { FormEvent, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { CalendarClock, ExternalLink, Pencil, Paperclip, RotateCcw, Save, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import GlobalLoader from "@/components/commoncomponents/globalloader";
import { RichEditor } from "@/components/rich-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealtime } from "@/hooks/useRealtime";
import { toIST } from "@/lib/time";
import { formatStatus } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const statuses = ["OPEN", "TRIAGED", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const issueTypes = ["BUG", "CR"];
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

type OptionRow = { id: string; name: string; projectId?: string };
type CommentAttachment = { url: string; label: string };
type CommentRow = {
  id: string;
  body: string;
  bodyJson: { attachment?: CommentAttachment } | null;
  authorId: string;
  authorName: string;
  createdAt: string;
};
type HistoryRow = { id: string; fromStatus: string | null; toStatus: string; reason: string | null; actorName: string; createdAt: string };
type ActivityRow = { id: string; type: string; message: string; actorName?: string | null; metadata?: Record<string, unknown> | null; createdAt: string };
type AttachmentRow = { id: string; url: string; fileName: string };
type Issue = {
  id: string;
  ticketNo: string;
  title: string;
  description: string;
  type: string | null;
  priority: string | null;
  status: string;
  organizationName: string;
  reporterName: string;
  projectId: string | null;
  projectName: string | null;
  moduleId: string | null;
  moduleName: string | null;
  createdAt: string;
  updatedAt: string;
};

const statusClassName: Record<string, string> = {
  OPEN: "border-blue-100 bg-blue-50 text-blue-700",
  TRIAGED: "border-indigo-100 bg-indigo-50 text-indigo-700",
  IN_PROGRESS: "border-violet-100 bg-violet-50 text-violet-700",
  WAITING_FOR_USER: "border-amber-100 bg-amber-50 text-amber-700",
  RESOLVED: "border-emerald-100 bg-emerald-50 text-emerald-700",
  CLOSED: "border-slate-200 bg-slate-50 text-slate-600",
  REOPENED: "border-red-100 bg-red-50 text-red-700",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-500",
};

const typeClassName: Record<string, string> = {
  BUG: "border-red-100 bg-red-50 text-red-700",
  CR: "border-cyan-100 bg-cyan-50 text-cyan-700",
};

const priorityClassName: Record<string, string> = {
  LOW: "border-slate-200 bg-slate-50 text-slate-600",
  MEDIUM: "border-blue-100 bg-blue-50 text-blue-700",
  HIGH: "border-orange-100 bg-orange-50 text-orange-700",
  URGENT: "border-red-100 bg-red-50 text-red-700",
};

function FieldValue({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-800">{value || "Pending triage"}</p>
    </div>
  );
}

function renderMetadataValue(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "Not provided";
  return formatActivityMessage(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function formatActivityMessage(message: string) {
  return message.replace(/\b[A-Z]+(?:_[A-Z]+)+\b/g, (value) => formatStatus(value));
}

export function IssueDetailClient({ id, role }: { id: string; role: "ADMIN" | "USER" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "history" ? "history" : "comments";
  const { data, mutate } = useSWR(`/api/issues/${id}`, fetcher, { refreshInterval: 15000 });
  const { data: projectData } = useSWR(role === "ADMIN" ? "/api/admin/projects" : null, fetcher);
  const { data: moduleData } = useSWR(role === "ADMIN" ? "/api/admin/modules" : null, fetcher);
  const issue: Issue | undefined = data?.issue;
  const viewer = data?.viewer as { id: string; role: "ADMIN" | "USER" } | undefined;
  const [status, setStatus] = useState("IN_PROGRESS");
  const [projectId, setProjectId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("");
  const [comment, setComment] = useState("");
  const [commentAttachmentUrl, setCommentAttachmentUrl] = useState("");
  const [commentAttachmentLabel, setCommentAttachmentLabel] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAttachmentUrl, setEditAttachmentUrl] = useState("");
  const [editAttachmentLabel, setEditAttachmentLabel] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingTriage, setIsSavingTriage] = useState(false);

  useRealtime(["issues", "issue_comments", "issue_attachments", "issue_status_history", "issue_activity"], () => {
    void mutate();
  });

  if (!issue) return <GlobalLoader />;
  const currentIssue = issue;
  const selectedStatus = status || currentIssue.status;
  const selectedProjectId = projectId || currentIssue.projectId || "";
  const selectedModuleId = moduleId || currentIssue.moduleId || "";
  const selectedType = type || currentIssue.type || "";
  const selectedPriority = priority || currentIssue.priority || "";
  const attachments: AttachmentRow[] = data.attachments ?? [];
  const activities: ActivityRow[] = data.activity ?? [];
  const modules = (moduleData?.modules ?? []).filter((item: OptionRow) => !selectedProjectId || item.projectId === selectedProjectId);

  const updateTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const openEdit = () => {
    setEditTitle(currentIssue.title);
    setEditDescription(currentIssue.description);
    setEditAttachmentUrl("");
    setEditAttachmentLabel("");
    setEditOpen(true);
  };

  async function saveDetails() {
    setIsSavingDetails(true);
    try {
      const res = await fetch(`/api/issues/${currentIssue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          attachmentUrl: editAttachmentUrl,
          attachmentLabel: editAttachmentLabel,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(result.message || "Unable to update issue");
        return;
      }
      toast.success("Issue updated");
      setEditOpen(false);
      mutate();
    } finally {
      setIsSavingDetails(false);
    }
  }

  async function postComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const res = await fetch(`/api/issues/${currentIssue.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment, attachmentUrl: commentAttachmentUrl, attachmentLabel: commentAttachmentLabel }),
    });
    if (!res.ok) {
      const result = await res.json().catch(() => ({}));
      toast.error(result.message || "Unable to add comment");
      return;
    }
    setComment("");
    setCommentAttachmentUrl("");
    setCommentAttachmentLabel("");
    mutate();
  }

  async function deleteComment(commentId: string) {
    const res = await fetch(`/api/issues/${currentIssue.id}/comments/${commentId}`, {
      method: "DELETE",
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(result.message || "Unable to delete comment");
      return;
    }
    toast.success("Comment deleted");
    mutate();
  }

  async function removeAttachment(attachmentId: string) {
    setDeletingAttachmentId(attachmentId);
    try {
      const res = await fetch(`/api/issues/${currentIssue.id}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(result.message || "Unable to remove attachment");
        return;
      }
      toast.success("Attachment removed");
      mutate();
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function changeStatus() {
    setIsSavingStatus(true);
    try {
      const res = await fetch(`/api/issues/${currentIssue.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });
      if (!res.ok) return toast.error("Unable to change status");
      toast.success("Status updated");
      mutate();
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function saveTriage() {
    setIsSavingTriage(true);
    try {
      const res = await fetch(`/api/issues/${currentIssue.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId, moduleId: selectedModuleId, type: selectedType, priority: selectedPriority }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(result.message || "Unable to save triage");
      toast.success("Triage saved");
      mutate();
    } finally {
      setIsSavingTriage(false);
    }
  }

  async function reopen() {
    const res = await fetch(`/api/issues/${currentIssue.id}/reopen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Reopened from helpdesk" }),
    });
    if (!res.ok) return toast.error("Unable to reopen");
    toast.success("Issue reopened");
    mutate();
  }

  return (
    <main className="min-h-full bg-white p-6">
      <div className="space-y-4">
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{currentIssue.ticketNo}</Badge>
                <Badge variant="outline" className={statusClassName[currentIssue.status] ?? "border-slate-200 bg-slate-50"}>
                  {formatStatus(currentIssue.status)}
                </Badge>
                {currentIssue.type ? <Badge variant="outline" className={typeClassName[currentIssue.type] ?? ""}>{currentIssue.type}</Badge> : null}
                {currentIssue.priority ? <Badge variant="outline" className={priorityClassName[currentIssue.priority] ?? ""}>{currentIssue.priority}</Badge> : null}
              </div>
              <h1 className="truncate text-2xl font-semibold tracking-tight text-gray-900">{currentIssue.title}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{currentIssue.organizationName}</span>
                <span>-</span>
                <span>Raised by {currentIssue.reporterName}</span>
                <span>-</span>
                <CalendarClock className="h-4 w-4" />
                <span>{toIST(currentIssue.createdAt)}</span>
                <span>-</span>
                <span>Updated {toIST(currentIssue.updatedAt)}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {role === "USER" ? (
                <Button variant="outline" size="sm" onClick={openEdit}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              ) : null}
              {role === "ADMIN" ? (
                <div className="flex min-w-[260px] gap-2">
                  <Select value={selectedStatus} onValueChange={setStatus}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map((item) => <SelectItem key={item} value={item}>{formatStatus(item)}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button onClick={changeStatus} disabled={isSavingStatus || selectedStatus === currentIssue.status} className="bg-blue-600 text-white hover:bg-blue-700">
                    {isSavingStatus ? "Saving..." : "Update"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {role === "ADMIN" ? (
          <section className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-5">
              <div className="space-y-1">
                <Label required className="mb-1">Type</Label>
                <Select value={selectedType} onValueChange={setType}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{issueTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label required className="mb-1">Priority</Label>
                <Select value={selectedPriority} onValueChange={setPriority}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>{priorities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label required className="mb-1">Project</Label>
                <Select value={selectedProjectId} onValueChange={(value) => { setProjectId(value); setModuleId(""); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{(projectData?.projects ?? []).map((project: OptionRow) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label required className="mb-1">Module</Label>
                <Select value={selectedModuleId} onValueChange={setModuleId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select module" /></SelectTrigger>
                  <SelectContent>{modules.map((module: OptionRow) => <SelectItem key={module.id} value={module.id}>{module.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button className="w-full bg-blue-600 text-white hover:bg-blue-700" disabled={isSavingTriage || !selectedProjectId || !selectedModuleId || !selectedType || !selectedPriority} onClick={saveTriage}>
                  {isSavingTriage ? "Saving..." : "Save Triage"}
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-3 text-base font-semibold text-gray-900">Description</h2>
                <div
                  className="prose prose-sm max-w-none text-sm leading-6 text-gray-700 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6"
                  dangerouslySetInnerHTML={{ __html: currentIssue.description }}
                />
              </CardContent>
            </Card>

            {attachments.length ? (
              <Card>
                <CardContent className="p-5">
                  <h2 className="mb-3 text-base font-semibold text-gray-900">Attachments</h2>
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2 text-sm text-blue-700 transition hover:border-blue-200 hover:bg-blue-50">
                        <span className="flex min-w-0 items-center gap-2"><Paperclip className="h-4 w-4 shrink-0" /><span className="truncate">{attachment.fileName || attachment.url}</span></span>
                        <ExternalLink className="h-4 w-4 shrink-0" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <aside className="space-y-4">
            <Card>
              <CardContent className="grid gap-4 p-5">
                <FieldValue label="Project" value={currentIssue.projectName} />
                <FieldValue label="Module" value={currentIssue.moduleName} />
                <FieldValue label="Last Updated" value={toIST(currentIssue.updatedAt)} />
              </CardContent>
            </Card>
            {["RESOLVED", "CLOSED"].includes(currentIssue.status) ? (
              <Button variant="outline" className="w-full rounded-full" onClick={reopen}>
                <RotateCcw className="h-4 w-4" />
                Reopen issue
              </Button>
            ) : null}
          </aside>
        </div>

        <Tabs value={activeTab} onValueChange={updateTab}>
          <TabsList className="grid h-10 w-full grid-cols-2">
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="comments">
            <Card>
              <CardContent className="space-y-4 p-5">
                {(data.comments ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No comments yet.</p> : null}
                {(data.comments ?? []).map((item: CommentRow) => {
                  const canDelete = viewer?.id === item.authorId;
                  const attachment = item.bodyJson?.attachment;

                  return (
                    <div key={item.id} className="rounded-lg border bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-slate-700">{item.authorName}</span>
                        <span className="inline-flex items-center gap-1.5">
                          {toIST(item.createdAt)}
                          {canDelete ? (
                            <button
                              type="button"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50 hover:text-red-700"
                              onClick={() => deleteComment(item.id)}
                              aria-label="Delete comment"
                              title="Delete comment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </span>
                      </div>
                      <div
                        className="mt-2 text-sm leading-6 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6"
                        dangerouslySetInnerHTML={{ __html: item.body }}
                      />
                      {attachment ? (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm text-blue-700 transition hover:border-blue-200 hover:bg-blue-50"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Paperclip className="h-4 w-4 shrink-0" />
                            <span className="truncate">{attachment.label || attachment.url}</span>
                          </span>
                          <ExternalLink className="h-4 w-4 shrink-0" />
                        </a>
                      ) : null}
                    </div>
                  );
                })}
                <form onSubmit={postComment} className="space-y-3">
                  <Label>Add comment</Label>
                  <RichEditor value={comment} onChange={setComment} placeholder="Write a comment..." />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="mb-1">Attachment Link</Label>
                      <Input placeholder="Paste Jam, Lightshot, Drive, or reference link" value={commentAttachmentUrl} onChange={(event) => setCommentAttachmentUrl(event.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="mb-1">Attachment Label</Label>
                      <Input placeholder="Example: Updated screenshot" value={commentAttachmentLabel} onChange={(event) => setCommentAttachmentLabel(event.target.value)} />
                    </div>
                  </div>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700"><Send className="h-4 w-4" />Comment</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="history">
            <Card>
              <CardContent className="space-y-4 p-5">
                {(data.history ?? []).length === 0 && activities.length === 0 ? <p className="text-sm text-muted-foreground">No history yet.</p> : null}
                {(data.history ?? []).map((item: HistoryRow) => (
                  <div key={item.id} className="relative border-l-2 border-blue-200 pl-4 text-sm">
                    <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-blue-500" />
                    <p className="font-medium text-gray-900">{item.fromStatus ? `${formatStatus(item.fromStatus)} to ` : ""}{formatStatus(item.toStatus)}</p>
                    {item.reason ? <p className="mt-1 text-gray-600">{item.reason}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">{item.actorName} - {toIST(item.createdAt)}</p>
                  </div>
                ))}
                {activities.map((item) => (
                  <div key={item.id} className="relative border-l-2 border-slate-200 pl-4 text-sm">
                    <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-slate-400" />
                    <p className="font-medium text-gray-900">{formatActivityMessage(item.message)}</p>
                    {item.metadata?.from || item.metadata?.to ? <p className="mt-1 text-gray-600">From: {renderMetadataValue(item.metadata.from)}<br />To: {renderMetadataValue(item.metadata.to)}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">{item.actorName || formatStatus(item.type)} - {toIST(item.createdAt)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] overflow-x-hidden sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Issue</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label required className="mb-1">Title</Label>
              <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
            </div>
            <div>
              <Label required className="mb-1">Description</Label>
              <RichEditor value={editDescription} onChange={setEditDescription} compact />
            </div>
            {attachments.length ? (
              <div>
                <Label className="mb-1">Current Attachments</Label>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm">
                      <a href={attachment.url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center justify-between gap-2 text-blue-700">
                        <span className="truncate">{attachment.fileName || attachment.url}</span>
                        <ExternalLink className="h-4 w-4 shrink-0" />
                      </a>
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => removeAttachment(attachment.id)}
                        disabled={deletingAttachmentId === attachment.id}
                        aria-label="Remove attachment"
                        title="Remove attachment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <Label className="mb-1">Add Attachment Link</Label>
              <Input placeholder="Paste Jam, Lightshot, Drive, or reference link" value={editAttachmentUrl} onChange={(event) => setEditAttachmentUrl(event.target.value)} />
            </div>
            <div>
              <Label className="mb-1">Attachment Label</Label>
              <Input placeholder="Example: Login screen recording" value={editAttachmentLabel} onChange={(event) => setEditAttachmentLabel(event.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSavingDetails}><X className="h-4 w-4" />Cancel</Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={saveDetails} disabled={isSavingDetails}><Save className="h-4 w-4" />{isSavingDetails ? "Saving..." : "Save Issue"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
