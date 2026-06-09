"use client";

import { FormEvent, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatStatus } from "@/lib/utils";
import { useRealtime } from "@/hooks/useRealtime";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const statuses = ["TRIAGED", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED", "CANCELLED"];

type OptionRow = {
  id: string;
  name: string;
  projectId?: string;
};

type CommentRow = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};

type HistoryRow = {
  id: string;
  toStatus: string;
  actorName: string;
  createdAt: string;
};

export function IssueDetailClient({
  id,
  role,
}: {
  id: string;
  role: "ADMIN" | "USER";
}) {
  const { data, mutate } = useSWR(`/api/issues/${id}`, fetcher, { refreshInterval: 15000 });
  const { data: projectData } = useSWR(role === "ADMIN" ? "/api/admin/projects" : null, fetcher);
  const { data: moduleData } = useSWR(role === "ADMIN" ? "/api/admin/modules" : null, fetcher);
  const [status, setStatus] = useState("IN_PROGRESS");
  const [projectId, setProjectId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [comment, setComment] = useState("");

  const issue = data?.issue;
  useRealtime(["issues", "issue_comments", "issue_attachments", "issue_status_history", "issue_activity"], () => {
    void mutate();
  });
  if (!issue) return <Card className="p-6">Loading issue...</Card>;

  async function postComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const res = await fetch(`/api/issues/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment }),
    });
    if (!res.ok) return toast.error("Unable to add comment");
    setComment("");
    mutate();
  }

  async function changeStatus() {
    const res = await fetch(`/api/issues/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return toast.error("Unable to change status");
    toast.success("Status updated");
    mutate();
  }

  async function assign() {
    const res = await fetch(`/api/issues/${id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, moduleId }),
    });
    if (!res.ok) return toast.error("Unable to assign issue");
    toast.success("Project and module assigned");
    mutate();
  }

  async function reopen() {
    const res = await fetch(`/api/issues/${id}/reopen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Reopened from helpdesk" }),
    });
    if (!res.ok) return toast.error("Unable to reopen");
    toast.success("Issue reopened");
    mutate();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{issue.ticketNo}</Badge>
              <Badge variant="secondary">{formatStatus(issue.status)}</Badge>
              <Badge variant="outline">{issue.type}</Badge>
              <Badge variant="outline">{issue.priority}</Badge>
            </div>
            <CardTitle className="text-xl">{issue.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: issue.description }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Comments</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(data.comments ?? []).map((item: CommentRow) => (
              <div key={item.id} className="rounded-lg border bg-slate-50 p-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-slate-700">{item.authorName}</span>
                  <span>{new Date(item.createdAt).toLocaleString("en-IN")}</span>
                </div>
                <div className="mt-2 text-sm" dangerouslySetInnerHTML={{ __html: item.body }} />
              </div>
            ))}
            <form onSubmit={postComment} className="space-y-2">
              <Label>Add comment</Label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} required />
              <Button>Comment</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <aside className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Routing</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Organization:</span> {issue.organizationName}</p>
            <p><span className="text-muted-foreground">Project:</span> {issue.projectName || "Unassigned"}</p>
            <p><span className="text-muted-foreground">Module:</span> {issue.moduleName || "Unassigned"}</p>
            <p><span className="text-muted-foreground">Reporter:</span> {issue.reporterName}</p>
          </CardContent>
        </Card>

        {role === "ADMIN" && (
          <Card>
            <CardHeader><CardTitle>Assign Project / Module</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger>
                <SelectContent>
                  {(projectData?.projects ?? []).map((project: OptionRow) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger><SelectValue placeholder="Module" /></SelectTrigger>
                <SelectContent>
                  {(moduleData?.modules ?? [])
                    .filter((item: OptionRow) => !projectId || item.projectId === projectId)
                    .map((module: OptionRow) => (
                      <SelectItem key={module.id} value={module.id}>{module.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={assign} disabled={!projectId || !moduleId}>Assign</Button>
            </CardContent>
          </Card>
        )}

        {role === "ADMIN" && (
          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map((item) => <SelectItem key={item} value={item}>{formatStatus(item)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={changeStatus}>Update status</Button>
            </CardContent>
          </Card>
        )}

        {["RESOLVED", "CLOSED"].includes(issue.status) && (
          <Button variant="outline" className="w-full" onClick={reopen}>Reopen issue</Button>
        )}

        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(data.history ?? []).map((item: HistoryRow) => (
              <div key={item.id} className="border-l-2 border-blue-200 pl-3 text-sm">
                <p className="font-medium">{formatStatus(item.toStatus)}</p>
                <p className="text-xs text-muted-foreground">{item.actorName} - {new Date(item.createdAt).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
