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
  Play,
  Save,
  Square,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import GlobalLoader from "@/components/commoncomponents/globalloader";
import { NotFoundCard } from "@/components/commoncomponents/not-found-card";
import { RichEditor } from "@/components/rich-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
type CommentRow = { id: string; body: string; bodyJson?: { mentions?: Array<{ id: string; name: string }> } | null; authorId?: string; authorName: string; createdAt: string };
type HistoryRow = { id: string; fromStatus: string | null; toStatus: string; reason: string | null; actorName: string; createdAt: string };
type ActivityRow = { id: string; type: string; message: string; actorName?: string | null; createdAt: string };
type WorklogRow = { id: string; workerId: string | null; workerRole: string; workerName: string; startedAt: string; stoppedAt: string | null; durationMinutes: number | null; note: string | null };
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
  projectName: string | null;
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
  if (ticket.type === "EPIC") {
    return ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"];
  }
  if (role === "ADMIN") {
    return ["NEW", "ACCEPTED", "DEV_IN_PROGRESS", "DEV_REVIEW", "READY_FOR_QA", "QA_IN_PROGRESS", "READY_FOR_PRODUCTION", "REOPENED"];
  }
  if (role === "DEVELOPER" && ticket.assignedDeveloperId === viewerId) {
    return ["NEW", "ACCEPTED", "DEV_IN_PROGRESS", "DEV_REVIEW", "READY_FOR_QA", "REOPENED"];
  }
  if (role === "QUALITY ANALYST" && ticket.assignedQaId === viewerId) {
    return ["READY_FOR_QA", "QA_IN_PROGRESS", "READY_FOR_PRODUCTION", "REOPENED"];
  }
  return [ticket.status];
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
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [closedMentionQuery, setClosedMentionQuery] = useState<string | null>(null);
  const [worklogNote, setWorklogNote] = useState("");
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [busyStatus, setBusyStatus] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [savingWorklog, setSavingWorklog] = useState(false);
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkType, setLinkType] = useState("RELATES_TO");
  const [savingLink, setSavingLink] = useState(false);

  useRealtime(
    ["core_tickets", "core_ticket_comments", "core_ticket_status_history", "core_ticket_activity", "core_ticket_worklogs"],
    () => { void mutate(); },
  );

  if (isLoading) return <GlobalLoader />;
  const rawTicket: Ticket | undefined = data?.ticket;
  if (!rawTicket) {
    return (
      <NotFoundCard
        title="Core ticket not found"
        description="The ticket number does not match a core ticket you can access."
        actionHref="/dashboard/core-tickets"
        actionLabel="Back to Core Tickets"
      />
    );
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
  const childTickets: ChildTicket[] = data?.childTickets ?? [];
  const links: LinkRow[] = data?.links ?? [];
  const openWorklog = worklogs.find((w) => !w.stoppedAt);
  const mentionCandidates = mentionData?.users ?? [];
  const mentionQuery = getMentionQuery(comment);
  const mentionSuggestions =
    mentionQuery === null || mentionQuery === closedMentionQuery
      ? []
      : mentionCandidates
          .filter((c: InternalUser) => `${c.name} ${c.email}`.toLowerCase().includes(mentionQuery))
          .slice(0, 6);

  const isEpic = ticket.type === "EPIC";
  const epicChildDone = childTickets.filter((c) => c.status === "DONE" || c.status === "READY_FOR_PRODUCTION").length;
  const epicProgress = childTickets.length > 0 ? Math.round((epicChildDone / childTickets.length) * 100) : 0;

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
    setBusyStatus(true);
    try {
      const res = await fetch(`/api/core-tickets/${ticket.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(result.message || "Unable to move status");
      toast.success("Status updated");
      setSelectedStatus("");
      mutate();
    } finally {
      setBusyStatus(false);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingComment(true);
    try {
      const res = await fetch(`/api/core-tickets/${ticket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: comment, mentionedUserIds }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(result.message || "Unable to add comment");
      setComment("");
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
        body: JSON.stringify({ targetTicketId: linkTargetId, linkType }),
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

  const statusOptions = statusOptionsFor(viewer.role, ticket, viewer.id);
  const effectiveStatus = selectedStatus || ticket.status;
  const handleCommentChange = (value: string) => {
    setComment(value);
    const nextQuery = getMentionQuery(value);
    if (nextQuery === null) setClosedMentionQuery(null);
    setActiveMentionIndex(0);
  };
  const insertMention = (candidate: InternalUser) => {
    setMentionedUserIds((current) => (current.includes(candidate.id) ? current : [...current, candidate.id]));
    setComment((current) => insertMentionInHtml(current, `@${candidate.name}`, candidate.id));
    setClosedMentionQuery(candidate.name.toLowerCase().trim());
    setActiveMentionIndex(0);
  };
  const handleMentionKeyDown = (event: KeyboardEvent): boolean | void => {
    if (!mentionSuggestions.length) return false;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveMentionIndex((i) => (i + 1) % mentionSuggestions.length);
      return true;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveMentionIndex((i) => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length);
      return true;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      insertMention(mentionSuggestions[activeMentionIndex] ?? mentionSuggestions[0]);
      return true;
    }
    return false;
  };
  const canAssign =
    viewer.role === "ADMIN" ||
    (viewer.role === "DEVELOPER" && ticket.assignedDeveloperId === viewer.id) ||
    (viewer.role === "QUALITY ANALYST" && ticket.assignedQaId === viewer.id);
  const canWorklog =
    viewer.role === "ADMIN" ||
    (viewer.role === "DEVELOPER" && ticket.status === "DEV_IN_PROGRESS") ||
    (viewer.role === "QUALITY ANALYST" && ticket.status === "QA_IN_PROGRESS");

  return (
    <main className="min-h-full bg-white p-4 sm:p-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/core-tickets")} className="px-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{ticket.ticketNo}</Badge>
                <Badge variant="outline" className={statusClassName[ticket.status] ?? ""}>
                  {formatStatus(ticket.status)}
                </Badge>
                {ticket.type ? (
                  <Badge variant="outline" className={typeClassName[ticket.type] ?? ""}>
                    {formatStatus(ticket.type)}
                  </Badge>
                ) : null}
                {ticket.priority ? (
                  <Badge variant="outline" className={priorityClassName[ticket.priority] ?? ""}>
                    {formatStatus(ticket.priority)}
                  </Badge>
                ) : null}
              </div>
              <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">{ticket.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Created by {ticket.createdByName || "Unknown"}
                {ticket.epicTicketNo ? (
                  <> &middot; EPIC: <Link href={`/dashboard/core-tickets/${ticket.epicTicketNo}`} className="font-medium text-purple-700">{ticket.epicTicketNo}</Link></>
                ) : null}
                {ticket.parentTaskTicketNo ? (
                  <> &middot; Parent: <Link href={`/dashboard/core-tickets/${ticket.parentTaskTicketNo}`} className="font-medium text-blue-700">{ticket.parentTaskTicketNo}</Link></>
                ) : null}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex min-w-[260px] gap-2">
                <Select value={effectiveStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((item) => (
                      <SelectItem key={item} value={item}>{formatStatus(item)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={moveStatus}
                  disabled={busyStatus || effectiveStatus === ticket.status}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
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
                <span className="text-sm text-muted-foreground">
                  {epicChildDone} / {childTickets.length} completed
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-purple-600 transition-all duration-500"
                  style={{ width: `${epicProgress}%` }}
                />
              </div>
              <div className="space-y-2 pt-1">
                {childTickets.map((child) => (
                  <Link
                    key={child.id}
                    href={`/dashboard/core-tickets/${child.ticketNo}`}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 px-3 py-2 text-sm transition hover:border-purple-200 hover:bg-purple-50/40"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={typeClassName[child.type ?? ""] ?? ""}>
                        {formatStatus(child.type ?? "")}
                      </Badge>
                      <span className="font-medium text-blue-700">{child.ticketNo}</span>
                      <span className="text-slate-700">{child.title}</span>
                    </div>
                    <Badge variant="outline" className={statusClassName[child.status] ?? ""}>
                      {formatStatus(child.status)}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="text-base font-semibold text-slate-900">Description</h2>
              <div
                className={`${renderedRichTextClassName} text-slate-800`}
                dangerouslySetInnerHTML={{ __html: ticket.description }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Project</p>
                <p className="mt-1 text-sm font-semibold">{ticket.projectName || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Module</p>
                <p className="mt-1 text-sm font-semibold">{ticket.moduleName || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Developer</p>
                <p className="mt-1 text-sm font-semibold">{ticket.developerName || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Quality Analyst</p>
                <p className="mt-1 text-sm font-semibold">{ticket.qaName || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Admin Owner</p>
                <p className="mt-1 text-sm font-semibold">{ticket.adminName || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Last Updated</p>
                <p className="mt-1 text-sm font-semibold">{toIST(ticket.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {canAssign ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-blue-700" />
                <h2 className="text-base font-semibold">Assignment</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Select value={developerId || ticket.assignedDeveloperId || ""} onValueChange={setDeveloperId}>
                  <SelectTrigger><SelectValue placeholder="Select Developer" /></SelectTrigger>
                  <SelectContent>
                    {developers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={qaId || ticket.assignedQaId || ""} onValueChange={setQaId}>
                  <SelectTrigger><SelectValue placeholder="Select Quality Analyst" /></SelectTrigger>
                  <SelectContent>
                    {qas.map((user) => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={saveAssignment}
                  disabled={savingAssignment || (!developerId && !qaId)}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Save className="h-4 w-4" />
                  {savingAssignment ? "Saving..." : "Save Assignment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {canWorklog && (ticket.status === "DEV_IN_PROGRESS" || ticket.status === "QA_IN_PROGRESS") ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-700" />
                <h2 className="text-base font-semibold">Worklog</h2>
              </div>
              <RichEditor
                value={worklogNote}
                onChange={setWorklogNote}
                placeholder={ticket.status === "QA_IN_PROGRESS" ? "Add QA worklog notes..." : "Add development worklog notes..."}
                compact
              />
              <div className="flex justify-end gap-2">
                {openWorklog ? (
                  <Button onClick={() => toggleWorklog("stop")} disabled={savingWorklog} variant="outline">
                    <Square className="h-4 w-4" /> Stop Worklog
                  </Button>
                ) : (
                  <Button onClick={() => toggleWorklog("start")} disabled={savingWorklog} className="bg-blue-600 text-white hover:bg-blue-700">
                    <Play className="h-4 w-4" /> Start Worklog
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!isEpic ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-blue-700" />
                <h2 className="text-base font-semibold">Linked Tickets</h2>
              </div>
              {links.length > 0 ? (
                <div className="space-y-2">
                  {links.map((link) => {
                    const isSource = link.sourceTicketId === ticket.id;
                    const linkedTicket = isSource
                      ? { ticketNo: link.targetTicketNo, title: link.targetTitle, id: link.targetTicketId }
                      : { ticketNo: link.sourceTicketNo, title: link.sourceTitle, id: link.sourceTicketId };
                    return (
                      <Link
                        key={link.id}
                        href={`/dashboard/core-tickets/${linkedTicket.ticketNo}`}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 px-3 py-2 text-sm transition hover:border-blue-200 hover:bg-blue-50/40"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                            {formatStatus(link.linkType)}
                          </Badge>
                          <span className="font-medium text-blue-700">{linkedTicket.ticketNo}</span>
                          <span className="text-slate-700">{linkedTicket.title}</span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-slate-400" />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No linked tickets.</p>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter ticket ID to link..."
                  value={linkTargetId}
                  onChange={(e) => setLinkTargetId(e.target.value)}
                />
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
                <Button onClick={addLink} disabled={savingLink || !linkTargetId} className="bg-blue-600 text-white hover:bg-blue-700">
                  <Link2 className="h-4 w-4" />
                  {savingLink ? "Adding..." : "Link"}
                </Button>
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
          <TabsContent value="comments" className="space-y-3 rounded-lg border bg-white p-4">
            {comments.length
              ? comments.map((item) => (
                  <div key={item.id} className="rounded-lg border bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-slate-700">{item.authorName}</span>
                      <span className="inline-flex items-center gap-2">
                        {toIST(item.createdAt)}
                        {canDeleteComment(viewer.role, viewer.id, item.authorId) ? (
                          <button type="button" onClick={() => deleteComment(item.id)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </span>
                    </div>
                    <div
                      className={renderedRichTextClassName}
                      dangerouslySetInnerHTML={{ __html: renderCommentBody(item.body, item.bodyJson?.mentions ?? []) }}
                    />
                  </div>
                ))
              : <p className="rounded-lg border bg-slate-50 p-4 text-sm text-muted-foreground">No comments yet.</p>}
            <form onSubmit={submitComment} className="space-y-3">
              <Label>Add comment</Label>
              <div className="relative">
                <RichEditor
                  value={comment}
                  onChange={handleCommentChange}
                  onKeyDown={handleMentionKeyDown}
                  placeholder="Write a comment..."
                />
                {mentionSuggestions.length ? (
                  <div className="absolute left-4 top-[92px] z-20 w-full max-w-sm overflow-hidden rounded-md border bg-white shadow-lg">
                    <div className="max-h-56 overflow-y-auto py-1">
                      {mentionSuggestions.map((candidate: InternalUser, index: number) => (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() => insertMention(candidate)}
                          className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${
                            index === activeMentionIndex ? "bg-blue-50" : "hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate font-medium text-slate-800">{candidate.name}</span>
                          <Badge variant="outline">{candidate.roleName}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex justify-end">
                <Button disabled={savingComment} className="bg-blue-600 text-white hover:bg-blue-700">
                  <MessageSquare className="h-4 w-4" />
                  {savingComment ? "Saving..." : "Add Comment"}
                </Button>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="history" className="space-y-3 rounded-lg border bg-white p-4">
            {[...history, ...activity].length ? (
              <div className="space-y-3">
                {history.map((item) => (
                  <div key={`h-${item.id}`} className="border-l-2 border-blue-200 pl-3">
                    <p className="text-sm font-medium">
                      {item.fromStatus
                        ? `${formatStatus(item.fromStatus)} to ${formatStatus(item.toStatus)}`
                        : formatStatus(item.toStatus)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.actorName} - {toIST(item.createdAt)}
                      {item.reason ? ` - ${item.reason}` : ""}
                    </p>
                  </div>
                ))}
                {activity.map((item) => (
                  <div key={`a-${item.id}`} className="border-l-2 border-slate-200 pl-3">
                    <p className="text-sm font-medium">
                      {item.message.replace(/\b[A-Z]+(?:_[A-Z]+)+\b/g, (value) => formatStatus(value))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.actorName || "System"} - {toIST(item.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            )}
          </TabsContent>
          <TabsContent value="worklogs" className="space-y-3 rounded-lg border bg-white p-4">
            {worklogs.length
              ? worklogs.map((item) => (
                  <div key={item.id} className="rounded-lg border bg-slate-50 p-3">
                    <p className="text-sm font-medium">
                      {item.workerName || "Unknown"} ({formatStatus(item.workerRole)}){" "}
                      {item.stoppedAt ? `logged ${item.durationMinutes || 0} minute(s)` : "is working"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Started {toIST(item.startedAt)}
                      {item.stoppedAt ? ` - Stopped ${toIST(item.stoppedAt)}` : ""}
                    </p>
                    {item.note ? (
                      <div className={`${renderedRichTextClassName} mt-2`} dangerouslySetInnerHTML={{ __html: item.note }} />
                    ) : null}
                  </div>
                ))
              : <p className="text-sm text-muted-foreground">No worklogs yet.</p>}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
