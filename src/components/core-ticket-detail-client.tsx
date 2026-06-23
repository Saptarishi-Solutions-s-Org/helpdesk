"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeft,
  CheckCircle2,
  Code2,
  ExternalLink,
  Layers,
  Link2,
  MessageSquare,
  Paperclip,
  Pencil,
  Play,
  Plus,
  Save,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import GlobalLoader from "@/components/commoncomponents/globalloader";
import { NotFoundCard } from "@/components/commoncomponents/not-found-card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealtime } from "@/hooks/useRealtime";
import { toIST } from "@/lib/time";
import { formatStatus } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const renderedRichTextClassName =
  "max-w-full overflow-hidden break-words text-sm leading-6 [overflow-wrap:anywhere] [&_*]:max-w-full [&_*]:break-words [&_*]:[overflow-wrap:anywhere] [&_.mention-badge]:inline-flex [&_.mention-badge]:rounded-full [&_.mention-badge]:border [&_.mention-badge]:border-blue-100 [&_.mention-badge]:bg-blue-50 [&_.mention-badge]:px-2 [&_.mention-badge]:py-0.5 [&_.mention-badge]:font-medium [&_.mention-badge]:text-blue-700 [&_.mention-badge]:no-underline [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6";

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

type Role = "ADMIN" | "DEVELOPER" | "QUALITY ANALYST";
type InternalUser = { id: string; name: string; email: string; roleName: string };
type CommentRow = { id: string; body: string; bodyJson?: { attachment?: { url: string; label: string }; mentions?: Array<{ id: string; name: string }> } | null; authorId?: string; authorName: string; createdAt: string };
type HistoryRow = { id: string; fromStatus: string | null; toStatus: string; reason: string | null; actorName: string; createdAt: string };
type ActivityRow = { id: string; type: string; message: string; actorName?: string | null; createdAt: string };
type WorklogRow = { id: string; workerId: string | null; workerRole: string; workerName: string; startedAt: string; stoppedAt: string | null; durationMinutes: number | null; note: string | null };
type AttachmentRow = { id: string; url: string; fileName: string };
type ChildTicket = { id: string; ticketNo: string; title: string; type: string | null; status: string };
type LinkRow = { id: string; linkType: string; sourceTicketId: string; sourceTicketNo: string; sourceTitle: string; targetTicketId: string; targetTicketNo: string; targetTitle: string; createdAt: string };
type Ticket = {
  id: string;
  ticketNo: string;
  type: string | null;
  priority: string | null;
  status: string;
  title: string;
  description: string;
  descriptionJson: string | null;
  epicId: string | null;
  epicTicketNo: string | null;
  parentTaskId: string | null;
  parentTaskTicketNo: string | null;
  projectId: string | null;
  projectName: string | null;
  moduleId: string | null;
  moduleName: string | null;
  assignedDeveloperId: string | null;
  developerName: string | null;
  assignedQaId: string | null;
  qaName: string | null;
  assignedAdminId: string | null;
  adminName: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

function plainTextFromHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function getMentionQuery(value: string) {
  const plain = plainTextFromHtml(value);
  const mentionStart = plain.lastIndexOf("@");
  if (mentionStart === -1) return null;
  const query = plain.slice(mentionStart + 1);
  if (query.length > 40 || /[,:;!?()[\]{}]/.test(query)) return null;
  return query.toLowerCase().trim();
}

function insertMentionInHtml(value: string, mentionText: string, mentionId: string) {
  const badgeHtml = `<span class="mention-badge" data-mention-id="${mentionId}">${mentionText}</span>&nbsp;`;
  if (!plainTextFromHtml(value)) return `<p>${badgeHtml}</p>`;
  const withClosingParagraph = value.replace(/@[^@<]*<\/p>\s*$/i, `${badgeHtml}</p>`);
  if (withClosingParagraph !== value) return withClosingParagraph;
  const inlineReplacement = value.replace(/@[^@<]*$/i, badgeHtml);
  if (inlineReplacement !== value) return inlineReplacement;
  if (/<\/p>\s*$/.test(value)) return value.replace(/<\/p>\s*$/, ` ${badgeHtml}</p>`);
  return `${value}<p>${badgeHtml}</p>`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderCommentBody(body: string, mentions: Array<{ id: string; name: string }>) {
  if (!mentions.length || body.includes("mention-badge")) return body;
  return mentions.reduce((html, mention) => {
    const pattern = new RegExp(`@${escapeRegExp(mention.name)}(?=\\s|<|&nbsp;|$)`, "g");
    return html.replace(pattern, `<span class="mention-badge" data-mention-id="${mention.id}">@${mention.name}</span>`);
  }, body);
}

function canDeleteComment(role: Role, viewerId: string, authorId?: string) {
  return role === "ADMIN" || viewerId === authorId;
}

function statusOptionsFor(role: Role, ticket: Ticket, viewerId: string) {
  let options: string[];
  if (ticket.type === "EPIC") {
    options = ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"];
  } else if (role === "ADMIN") {
    options = ["NEW", "ACCEPTED", "DEV_IN_PROGRESS", "DEV_REVIEW", "READY_FOR_QA", "QA_IN_PROGRESS", "READY_FOR_PRODUCTION", "REOPENED"];
  } else if (role === "DEVELOPER" && ticket.assignedDeveloperId === viewerId) {
    options = ["NEW", "ACCEPTED", "DEV_IN_PROGRESS", "DEV_REVIEW", "READY_FOR_QA", "REOPENED"];
  } else if (role === "QUALITY ANALYST" && ticket.assignedQaId === viewerId) {
    options = ["READY_FOR_QA", "QA_IN_PROGRESS", "READY_FOR_PRODUCTION", "REOPENED"];
  } else {
    return [ticket.status];
  }
  if (!options.includes(ticket.status)) options.unshift(ticket.status);
  return options;
}

export function CoreTicketDetailClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "comments";
  const id = pathname.split("/").pop() || "";
  const { data, isLoading, mutate } = useSWR(`/api/core-tickets/${id}`, fetcher, { refreshInterval: 15000 });
  const { data: mentionData } = useSWR(data?.ticket?.id ? `/api/core-tickets/${data.ticket.id}/mentions` : null, fetcher);
  const [developerId, setDeveloperId] = useState("");
  const [qaId, setQaId] = useState("");
  const [comment, setComment] = useState("");
  const [commentAttachmentUrl, setCommentAttachmentUrl] = useState("");
  const [commentAttachmentLabel, setCommentAttachmentLabel] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [closedMentionQuery, setClosedMentionQuery] = useState<string | null>(null);
  const [worklogNote, setWorklogNote] = useState("");
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [busyStatus, setBusyStatus] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [savingWorklog, setSavingWorklog] = useState(false);
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkType, setLinkType] = useState("RELATES_TO");
  const [savingLink, setSavingLink] = useState(false);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAttachments, setEditAttachments] = useState<Array<{ url: string; label: string }>>([]);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [subTaskOpen, setSubTaskOpen] = useState(false);
  const [subTaskTitle, setSubTaskTitle] = useState("");
  const [subTaskDesc, setSubTaskDesc] = useState("");
  const [subTaskPriority, setSubTaskPriority] = useState("");
  const [subTaskAttachments, setSubTaskAttachments] = useState<Array<{ url: string; label: string }>>([]);
  const [subTaskSubmitting, setSubTaskSubmitting] = useState(false);
  const { data: headerModulesData } = useSWR(
    data?.ticket?.projectId ? `/api/admin/modules?projectId=${data.ticket.projectId}` : null,
    fetcher,
  );
  const headerModules: Array<{ id: string; name: string; code: string }> = headerModulesData?.modules ?? [];

  useRealtime(["core_tickets", "core_ticket_comments", "core_ticket_status_history", "core_ticket_activity", "core_ticket_worklogs"], () => { void mutate(); });

  if (isLoading) return <GlobalLoader />;
  const rawTicket: Ticket | undefined = data?.ticket;
  if (!rawTicket) {
    return <NotFoundCard title="Core ticket not found" description="The ticket number does not match a core ticket you can access." actionHref="/dashboard/core-tickets" actionLabel="Back to Core Tickets" />;
  }
  const ticket = rawTicket;

  const viewer = data?.viewer as { id: string; role: Role };
  const users: InternalUser[] = data?.internalUsers ?? [];
  const developers = users.filter((u) => u.roleName === "DEVELOPER");
  const qas = users.filter((u) => u.roleName === "QUALITY ANALYST");
  const comments: CommentRow[] = data?.comments ?? [];
  const history: HistoryRow[] = data?.history ?? [];
  const activity: ActivityRow[] = data?.activity ?? [];
  const worklogs: WorklogRow[] = data?.worklogs ?? [];
  const attachments: AttachmentRow[] = data?.attachments ?? [];
  const childTickets: ChildTicket[] = data?.childTickets ?? [];
  const links: LinkRow[] = data?.links ?? [];
  const openWorklog = worklogs.find((w) => !w.stoppedAt);
  const mentionCandidates = mentionData?.users ?? [];
  const mentionQuery = getMentionQuery(comment);
  const mentionSuggestions = mentionQuery === null || mentionQuery === closedMentionQuery ? [] : mentionCandidates.filter((c: InternalUser) => `${c.name} ${c.email}`.toLowerCase().includes(mentionQuery)).slice(0, 6);

  const isEpic = ticket.type === "EPIC";
  const epicChildren = childTickets.filter((c) => c.type !== "SUBTASK");
  const subTaskChildren = childTickets.filter((c) => c.type === "SUBTASK");
  const epicChildDone = epicChildren.filter((c) => c.status === "DONE" || c.status === "READY_FOR_PRODUCTION").length;
  const epicProgress = epicChildren.length > 0 ? Math.round((epicChildDone / epicChildren.length) * 100) : 0;

  function updateTab(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function saveAssignment() {
    setSavingAssignment(true);
    try {
      const res = await fetch(`/api/core-tickets/${ticket.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ developerId: developerId || undefined, qaId: qaId || undefined }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(result.message || "Unable to save assignment");
      toast.success("Assignment saved");
      setDeveloperId("");
      setQaId("");
      mutate();
    } finally {
      setSavingAssignment(false);
    }
  }

  async function moveStatus() {
    const status = selectedStatus || ticket.status;
    const moduleId = selectedModule || ticket.moduleId || null;
    setBusyStatus(true);
    try {
      const hasStatusChange = selectedStatus && selectedStatus !== ticket.status;
      const hasModuleChange = selectedModule && selectedModule !== (ticket.moduleId ?? "");
      if (hasStatusChange) {
        const res = await fetch(`/api/core-tickets/${ticket.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) return toast.error(result.message || "Unable to move status");
      }
      if (hasModuleChange) {
        const res = await fetch(`/api/core-tickets/${ticket.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleId }),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) return toast.error(result.message || "Unable to update module");
      }
      toast.success("Updated");
      setSelectedStatus("");
      setSelectedModule("");
      mutate();
    } finally {
      setBusyStatus(false);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingComment(true);
    try {
      const bodyJson: Record<string, unknown> = {};
      if (mentionedUserIds.length) bodyJson.mentions = mentionedUserIds.map((id) => {
        const user = mentionCandidates.find((c: InternalUser) => c.id === id);
        return { id, name: user?.name || "Unknown" };
      });
      if (commentAttachmentUrl.trim()) {
        bodyJson.attachment = { url: commentAttachmentUrl.trim(), label: commentAttachmentLabel.trim() || commentAttachmentUrl.trim() };
      }
      const res = await fetch(`/api/core-tickets/${ticket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: comment, bodyJson: Object.keys(bodyJson).length ? bodyJson : undefined }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(result.message || "Unable to add comment");
      setComment("");
      setCommentAttachmentUrl("");
      setCommentAttachmentLabel("");
      setMentionedUserIds([]);
      mutate();
    } finally {
      setSavingComment(false);
    }
  }

  async function deleteComment(commentId: string) {
    const res = await fetch(`/api/core-tickets/${ticket.id}/comments/${commentId}`, { method: "DELETE" });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(result.message || "Unable to delete comment");
    toast.success("Comment deleted");
    mutate();
  }

  async function toggleWorklog(action: "start" | "stop") {
    setSavingWorklog(true);
    try {
      const res = await fetch(`/api/core-tickets/${ticket.id}/worklogs/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: worklogNote }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(result.message || "Unable to update worklog");
      setWorklogNote("");
      mutate();
    } finally {
      setSavingWorklog(false);
    }
  }

  async function addLink() {
    if (!linkTargetId) return;
    setSavingLink(true);
    try {
      const res = await fetch(`/api/core-tickets/${ticket.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTicketNo: linkTargetId, linkType }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(result.message || "Unable to add link");
      toast.success("Link added");
      setLinkTargetId("");
      mutate();
    } finally {
      setSavingLink(false);
    }
  }

  async function removeLink(linkId: string) {
    setDeletingLinkId(linkId);
    try {
      const res = await fetch(`/api/core-tickets/${ticket.id}/links/${linkId}`, { method: "DELETE" });
      if (!res.ok) return toast.error("Unable to remove link");
      toast.success("Link removed");
      mutate();
    } finally {
      setDeletingLinkId(null);
    }
  }

  async function removeAttachment(attachmentId: string) {
    setDeletingAttachmentId(attachmentId);
    try {
      const res = await fetch(`/api/core-tickets/${ticket.id}/attachments/${attachmentId}`, { method: "DELETE" });
      if (!res.ok) return toast.error("Unable to remove attachment");
      toast.success("Attachment removed");
      mutate();
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function saveDetails() {
    if (!editTitle.trim()) return toast.error("Title is required");
    setIsSavingDetails(true);
    try {
      const body: Record<string, unknown> = { title: editTitle, description: editDescription };
      const newAttachments = editAttachments.filter((a) => a.url.trim());
      if (newAttachments.length) body.attachments = newAttachments.map((a) => ({ url: a.url.trim(), label: a.label.trim() || undefined }));
      const res = await fetch(`/api/core-tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(result.message || "Unable to save");
      toast.success("Ticket updated");
      setEditOpen(false);
      mutate();
    } finally {
      setIsSavingDetails(false);
    }
  }

  const statusOptions = statusOptionsFor(viewer.role, ticket, viewer.id);
  const effectiveStatus = selectedStatus || ticket.status;
  const handleCommentChange = (value: string) => {
    setComment(value);
    const nextQuery = getMentionQuery(value);
    if (nextQuery === null) setClosedMentionQuery(null);
    setActiveMentionIndex(0);
  };
  const insertMention = (candidate: InternalUser) => {
    setMentionedUserIds((current) => current.includes(candidate.id) ? current : [...current, candidate.id]);
    setComment((current) => insertMentionInHtml(current, `@${candidate.name}`, candidate.id));
    setClosedMentionQuery(candidate.name.toLowerCase().trim());
    setActiveMentionIndex(0);
  };
  const handleMentionKeyDown = (event: KeyboardEvent): boolean | void => {
    if (!mentionSuggestions.length) return false;
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveMentionIndex((i) => (i + 1) % mentionSuggestions.length); return true; }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveMentionIndex((i) => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length); return true; }
    if (event.key === "Enter") { event.preventDefault(); insertMention(mentionSuggestions[activeMentionIndex] ?? mentionSuggestions[0]); return true; }
    return false;
  };
  const canAssign = viewer.role === "ADMIN" || (viewer.role === "DEVELOPER" && ticket.assignedDeveloperId === viewer.id) || (viewer.role === "QUALITY ANALYST" && ticket.assignedQaId === viewer.id);
  const canWorklog = viewer.role === "ADMIN" || (viewer.role === "DEVELOPER" && ticket.status === "DEV_IN_PROGRESS") || (viewer.role === "QUALITY ANALYST" && ticket.status === "QA_IN_PROGRESS");

  return (
    <main className="min-h-full bg-white p-4 sm:p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/core-tickets")} className="px-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setEditTitle(ticket.title); setEditDescription(ticket.description); setEditAttachments([]); setEditOpen(true); }}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          {ticket.type === "TASK" ? (
            <Button variant="outline" size="sm" onClick={() => { setSubTaskOpen(true); }}>
              <Plus className="h-4 w-4" /> Sub Task
            </Button>
          ) : null}
        </div>

        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{ticket.ticketNo}</Badge>
                <Badge variant="outline" className={statusClassName[ticket.status] ?? "border-slate-200 bg-slate-50"}>{formatStatus(ticket.status)}</Badge>
                {ticket.type ? <Badge variant="outline" className={typeClassName[ticket.type] ?? "border-slate-200 bg-slate-50 text-slate-600"}>{formatStatus(ticket.type)}</Badge> : null}
                {ticket.priority ? <Badge variant="outline" className={priorityClassName[ticket.priority] ?? "border-slate-200 bg-slate-50 text-slate-600"}>{formatStatus(ticket.priority)}</Badge> : null}
              </div>
              <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">{ticket.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Created by {ticket.createdByName || "Unknown"}
                {ticket.epicTicketNo ? <> &middot; EPIC: <Link href={`/dashboard/core-tickets/${ticket.epicTicketNo}`} className="font-medium text-purple-700">{ticket.epicTicketNo}</Link></> : null}
                {ticket.parentTaskTicketNo ? <> &middot; Parent: <Link href={`/dashboard/core-tickets/${ticket.parentTaskTicketNo}`} className="font-medium text-blue-700">{ticket.parentTaskTicketNo}</Link></> : null}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex min-w-[180px]">
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={ticket.moduleName || "Module"} /></SelectTrigger>
                  <SelectContent>
                    {headerModules.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex min-w-[260px] gap-2">
                <Select value={effectiveStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map((item) => <SelectItem key={item} value={item}>{formatStatus(item)}</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={moveStatus} disabled={busyStatus || (!selectedStatus && !selectedModule)} className="bg-blue-600 text-white hover:bg-blue-700">
                  {busyStatus ? "Saving..." : "Update"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {isEpic && childTickets.length > 0 ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-700" />
                <h2 className="text-base font-semibold">EPIC Progress</h2>
                <span className="text-sm text-muted-foreground">{epicChildDone} / {childTickets.length} completed</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-purple-600 transition-all duration-500" style={{ width: `${epicProgress}%` }} />
              </div>
              <div className="space-y-2 pt-1">
                {childTickets.map((child) => (
                  <Link key={child.id} href={`/dashboard/core-tickets/${child.ticketNo}`} className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 px-3 py-2 text-sm transition hover:border-purple-200 hover:bg-purple-50/40">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={typeClassName[child.type ?? ""] ?? "border-slate-200 bg-slate-50 text-slate-600"}>{formatStatus(child.type ?? "")}</Badge>
                      <span className="font-medium text-blue-700">{child.ticketNo}</span>
                      <span className="text-slate-700">{child.title}</span>
                    </div>
                    <Badge variant="outline" className={statusClassName[child.status] ?? "border-slate-200 bg-slate-50"}>{formatStatus(child.status)}</Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {ticket.type === "TASK" && childTickets.filter((c) => c.type === "SUBTASK").length > 0 ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-700" />
                <h2 className="text-base font-semibold">Sub Tasks</h2>
              </div>
              <div className="space-y-2">
                {childTickets.filter((c) => c.type === "SUBTASK").map((child) => (
                  <Link key={child.id} href={`/dashboard/core-tickets/${child.ticketNo}`} className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 px-3 py-2 text-sm transition hover:border-blue-200 hover:bg-blue-50/40">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-700">{child.ticketNo}</span>
                      <span className="text-slate-700">{child.title}</span>
                    </div>
                    <Badge variant="outline" className={statusClassName[child.status] ?? "border-slate-200 bg-slate-50"}>{formatStatus(child.status)}</Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="min-w-0 p-5">
                <h2 className="mb-3 text-base font-semibold text-gray-900">Description</h2>
                <div className="thin-scrollbar prose prose-sm max-h-80 max-w-none overflow-y-auto overflow-x-hidden break-words pr-2 text-sm leading-6 text-gray-700 [overflow-wrap:anywhere] [&_*]:max-w-full [&_*]:break-words [&_*]:[overflow-wrap:anywhere] [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: ticket.description }} />
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
          <aside className="min-w-0 space-y-4">
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="grid min-w-0 gap-4 p-5">
                <div><p className="text-xs font-medium text-muted-foreground">Project</p><p className="mt-1 text-sm font-semibold">{ticket.projectName || "Not assigned"}</p></div>
                <div><p className="text-xs font-medium text-muted-foreground">Module</p><p className="mt-1 text-sm font-semibold">{ticket.moduleName || "Not assigned"}</p></div>
                <div><p className="text-xs font-medium text-muted-foreground">Developer</p><p className="mt-1 text-sm font-semibold">{ticket.developerName || "Not assigned"}</p></div>
                <div><p className="text-xs font-medium text-muted-foreground">Quality Analyst</p><p className="mt-1 text-sm font-semibold">{ticket.qaName || "Not assigned"}</p></div>
                <div><p className="text-xs font-medium text-muted-foreground">Admin Owner</p><p className="mt-1 text-sm font-semibold">{ticket.adminName || "Not assigned"}</p></div>
                <div><p className="text-xs font-medium text-muted-foreground">Created</p><p className="mt-1 text-sm font-semibold">{toIST(ticket.createdAt)}</p></div>
                <div><p className="text-xs font-medium text-muted-foreground">Last Updated</p><p className="mt-1 text-sm font-semibold">{toIST(ticket.updatedAt)}</p></div>
              </CardContent>
            </Card>
          </aside>
        </div>

        {canAssign ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2"><Code2 className="h-4 w-4 text-blue-700" /><h2 className="text-base font-semibold">Assignment</h2></div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Select value={developerId || ticket.assignedDeveloperId || ""} onValueChange={setDeveloperId}>
                  <SelectTrigger><SelectValue placeholder="Select Developer" /></SelectTrigger>
                  <SelectContent>{developers.map((user) => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={qaId || ticket.assignedQaId || ""} onValueChange={setQaId}>
                  <SelectTrigger><SelectValue placeholder="Select Quality Analyst" /></SelectTrigger>
                  <SelectContent>{qas.map((user) => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={saveAssignment} disabled={savingAssignment || (!developerId && !qaId)} className="bg-blue-600 text-white hover:bg-blue-700"><Save className="h-4 w-4" />{savingAssignment ? "Saving..." : "Save Assignment"}</Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {canWorklog && (ticket.status === "DEV_IN_PROGRESS" || ticket.status === "QA_IN_PROGRESS") ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-700" /><h2 className="text-base font-semibold">Worklog</h2></div>
              <RichEditor value={worklogNote} onChange={setWorklogNote} placeholder={ticket.status === "QA_IN_PROGRESS" ? "Add QA worklog notes..." : "Add development worklog notes..."} compact />
              <div className="flex justify-end gap-2">
                {openWorklog ? (
                  <Button onClick={() => toggleWorklog("stop")} disabled={savingWorklog} variant="outline"><Square className="h-4 w-4" />Stop Worklog</Button>
                ) : (
                  <Button onClick={() => toggleWorklog("start")} disabled={savingWorklog} className="bg-blue-600 text-white hover:bg-blue-700"><Play className="h-4 w-4" />Start Worklog</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!isEpic ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-blue-700" /><h2 className="text-base font-semibold">Linked Tickets</h2></div>
              {links.length ? (
                <div className="space-y-2">
                  {links.map((link) => {
                    const isSource = link.sourceTicketId === ticket.id;
                    const linkedTicket = isSource ? { ticketNo: link.targetTicketNo, title: link.targetTitle, id: link.targetTicketId } : { ticketNo: link.sourceTicketNo, title: link.sourceTitle, id: link.sourceTicketId };
                    return (
                      <div key={link.id} className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 px-3 py-2 text-sm transition hover:border-blue-200 hover:bg-blue-50/40">
                        <Link href={`/dashboard/core-tickets/${linkedTicket.ticketNo}`} className="flex min-w-0 flex-1 items-center gap-2">
                          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">{formatStatus(link.linkType)}</Badge>
                          <span className="font-medium text-blue-700">{linkedTicket.ticketNo}</span>
                          <span className="text-slate-700">{linkedTicket.title}</span>
                        </Link>
                        <button type="button" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => removeLink(link.id)} disabled={deletingLinkId === link.id} aria-label="Remove link" title="Remove link">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-muted-foreground">No linked tickets.</p>}
              <div className="flex gap-2">
                <Input placeholder="Enter ticket number (e.g. SRS-CORE-002)" value={linkTargetId} onChange={(e) => setLinkTargetId(e.target.value)} />
                <Select value={linkType} onValueChange={setLinkType}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RELATES_TO">Relates To</SelectItem>
                    <SelectItem value="BLOCKS">Blocks</SelectItem>
                    <SelectItem value="IS_BLOCKED_BY">Is Blocked By</SelectItem>
                    <SelectItem value="DUPLICATES">Duplicates</SelectItem>
                    <SelectItem value="IS_DUPLICATED_BY">Is Duplicated By</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addLink} disabled={savingLink || !linkTargetId} className="bg-blue-600 text-white hover:bg-blue-700"><Link2 className="h-4 w-4" />{savingLink ? "Adding..." : "Link"}</Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Tabs value={activeTab} onValueChange={updateTab}>
          <TabsList className="grid h-10 w-full grid-cols-3">
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="worklogs">Worklogs</TabsTrigger>
          </TabsList>
          <TabsContent value="comments">
            <Card>
              <CardContent className="space-y-4 p-5">
                {comments.length === 0 ? <p className="text-sm text-muted-foreground">No comments yet.</p> : null}
                {comments.map((item) => {
                  const canDelete = canDeleteComment(viewer.role, viewer.id, item.authorId);
                  const attachment = item.bodyJson?.attachment;
                  const mentions = item.bodyJson?.mentions ?? [];
                  return (
                    <div key={item.id} className="rounded-lg border bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-slate-700">{item.authorName}</span>
                        <span className="inline-flex items-center gap-1.5">
                          {toIST(item.createdAt)}
                          {canDelete ? (
                            <button type="button" className="inline-flex h-6 w-6 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50 hover:text-red-700" onClick={() => deleteComment(item.id)} aria-label="Delete comment" title="Delete comment">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </span>
                      </div>
                      <div className="mt-2 max-w-full overflow-hidden break-words text-sm leading-6 [overflow-wrap:anywhere] [&_*]:max-w-full [&_*]:break-words [&_*]:[overflow-wrap:anywhere] [&_.mention-badge]:inline-flex [&_.mention-badge]:rounded-full [&_.mention-badge]:border [&_.mention-badge]:border-blue-100 [&_.mention-badge]:bg-blue-50 [&_.mention-badge]:px-2 [&_.mention-badge]:py-0.5 [&_.mention-badge]:font-medium [&_.mention-badge]:text-blue-700 [&_.mention-badge]:no-underline [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: renderCommentBody(item.body, mentions) }} />
                      {attachment ? (
                        <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm text-blue-700 transition hover:border-blue-200 hover:bg-blue-50">
                          <span className="flex min-w-0 items-center gap-2"><Paperclip className="h-4 w-4 shrink-0" /><span className="truncate">{attachment.label || attachment.url}</span></span>
                          <ExternalLink className="h-4 w-4 shrink-0" />
                        </a>
                      ) : null}
                    </div>
                  );
                })}
                <form onSubmit={submitComment} className="space-y-3">
                  <Label>Add comment</Label>
                  <div className="relative">
                    <RichEditor value={comment} onChange={handleCommentChange} onKeyDown={handleMentionKeyDown} placeholder="Write a comment..." />
                    {mentionSuggestions.length ? (
                      <div className="absolute left-4 top-[92px] z-20 w-full max-w-sm overflow-hidden rounded-md border bg-white shadow-lg">
                        <div className="max-h-56 overflow-y-auto py-1">
                          {mentionSuggestions.map((candidate: InternalUser, index: number) => (
                            <button key={candidate.id} type="button" className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-blue-50 ${index === activeMentionIndex ? "bg-blue-50" : ""}`} onClick={() => insertMention(candidate)}>
                              <span className="min-w-0 truncate">{candidate.name}</span>
                              <span className="shrink-0 rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{formatStatus(candidate.roleName)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="mb-1">Attachment Link</Label>
                      <Input placeholder="Paste Jam, Lightshot, Drive, or reference link" value={commentAttachmentUrl} onChange={(e) => setCommentAttachmentUrl(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="mb-1">Attachment Label</Label>
                      <Input placeholder="Example: Updated screenshot" value={commentAttachmentLabel} onChange={(e) => setCommentAttachmentLabel(e.target.value)} />
                    </div>
                  </div>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700"><MessageSquare className="h-4 w-4" />Comment</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="history">
            <Card>
              <CardContent className="space-y-4 p-5">
                {history.length === 0 && activity.length === 0 ? <p className="text-sm text-muted-foreground">No history yet.</p> : null}
                {history.map((item) => (
                  <div key={item.id} className="relative border-l-2 border-blue-200 pl-4 text-sm">
                    <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-blue-500" />
                    <p className="font-medium text-gray-900">{item.fromStatus ? `${formatStatus(item.fromStatus)} to ` : ""}{formatStatus(item.toStatus)}</p>
                    {item.reason ? <p className="mt-1 text-gray-600">{item.reason}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">{item.actorName} - {toIST(item.createdAt)}</p>
                  </div>
                ))}
                {activity.map((item) => (
                  <div key={item.id} className="relative border-l-2 border-slate-200 pl-4 text-sm">
                    <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-slate-400" />
                    <p className="font-medium text-gray-900">{item.message.replace(/\b[A-Z]+(?:_[A-Z]+)+\b/g, (v) => formatStatus(v))}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.actorName || "System"} - {toIST(item.createdAt)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="worklogs">
            <Card>
              <CardContent className="space-y-4 p-5">
                {worklogs.length === 0 ? <p className="text-sm text-muted-foreground">No worklogs yet.</p> : null}
                {worklogs.map((item) => (
                  <div key={item.id} className="rounded-lg border bg-slate-50 p-3">
                    <p className="text-sm font-medium">{item.workerName || "Unknown"} ({formatStatus(item.workerRole)}) {item.stoppedAt ? `logged ${item.durationMinutes || 0} minute(s)` : "is working"}</p>
                    <p className="text-xs text-muted-foreground">Started {toIST(item.startedAt)}{item.stoppedAt ? ` - Stopped ${toIST(item.stoppedAt)}` : ""}</p>
                    {item.note ? <div className={`${renderedRichTextClassName} mt-2`} dangerouslySetInnerHTML={{ __html: item.note }} /> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] overflow-x-hidden sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Ticket</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label required className="mb-1">Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
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
                      <button type="button" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => removeAttachment(attachment.id)} disabled={deletingAttachmentId === attachment.id} aria-label="Remove attachment" title="Remove attachment">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label className="mb-1">Add Attachment Links</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditAttachments((items) => [...items, { url: "", label: "" }])}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
              {editAttachments.map((attachment, index) => (
                <div key={index} className="grid gap-2 rounded-lg border bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <Input placeholder="Paste Jam, Lightshot, Drive, or reference link" value={attachment.url} onChange={(e) => setEditAttachments((items) => items.map((item, i) => i === index ? { ...item, url: e.target.value } : item))} />
                  <Input placeholder="Label" value={attachment.label} onChange={(e) => setEditAttachments((items) => items.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} />
                  <Button type="button" variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 hover:text-red-700" disabled={editAttachments.length === 1} onClick={() => setEditAttachments((items) => items.filter((_, i) => i !== index))} aria-label="Remove attachment row">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSavingDetails}><X className="h-4 w-4" />Cancel</Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={saveDetails} disabled={isSavingDetails}><Save className="h-4 w-4" />{isSavingDetails ? "Saving..." : "Save Ticket"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={subTaskOpen} onOpenChange={(open) => { setSubTaskOpen(open); if (!open) { setSubTaskTitle(""); setSubTaskDesc(""); setSubTaskPriority(""); setSubTaskAttachments([{ url: "", label: "" }]); } }}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
          <DialogHeader><DialogTitle>Create Sub Task</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="mb-1">Priority</Label>
                <Select value={subTaskPriority} onValueChange={setSubTaskPriority}>
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
            <div className="space-y-1">
              <Label required className="mb-1">Title</Label>
              <Input placeholder="Enter sub task title" value={subTaskTitle} onChange={(e) => setSubTaskTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label required className="mb-1">Description</Label>
              <div className="w-full min-w-0">
                <RichEditor value={subTaskDesc} onChange={setSubTaskDesc} placeholder="Describe the sub task..." compact />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="mb-1">Attachment Links</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setSubTaskAttachments((items) => [...items, { url: "", label: "" }])}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
              {subTaskAttachments.map((attachment, index) => (
                <div key={index} className="grid gap-2 rounded-lg border bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_auto]">
                  <Input placeholder="Paste link" value={attachment.url} onChange={(e) => setSubTaskAttachments((items) => items.map((item, i) => i === index ? { ...item, url: e.target.value } : item))} />
                  <Input placeholder="Label" value={attachment.label} onChange={(e) => setSubTaskAttachments((items) => items.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} />
                  <Button type="button" variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setSubTaskAttachments((items) => items.length === 1 ? [{ url: "", label: "" }] : items.filter((_, i) => i !== index))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={async () => {
              if (!subTaskTitle.trim() || !subTaskDesc.trim()) { toast.error("Title and description are required"); return; }
              setSubTaskSubmitting(true);
              try {
                const cleanAttachments = subTaskAttachments.filter((a) => a.url.trim());
                const res = await fetch("/api/core-tickets", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "SUBTASK",
                    priority: subTaskPriority || null,
                    title: subTaskTitle,
                    description: subTaskDesc,
                    parentTaskId: ticket.id,
                    epicId: ticket.epicId,
                    attachments: cleanAttachments,
                  }),
                });
                const result = await res.json().catch(() => ({}));
                if (!res.ok) { toast.error(result.message || "Failed to create"); return; }
                toast.success("Sub Task created");
                setSubTaskOpen(false);
                setSubTaskTitle(""); setSubTaskDesc(""); setSubTaskPriority(""); setSubTaskAttachments([{ url: "", label: "" }]);
                mutate();
              } catch { toast.error("Unexpected error"); }
              finally { setSubTaskSubmitting(false); }
            }} disabled={subTaskSubmitting} className="bg-blue-500 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
              {subTaskSubmitting ? "Creating..." : "Create Sub Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
