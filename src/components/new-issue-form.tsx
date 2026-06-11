"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";
import { RichEditor } from "@/components/rich-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createIssueSchema } from "@/lib/validators/issue";

type FieldErrors = Record<string, string>;
type AttachmentDraft = { url: string; label: string };
type OrganizationRow = { id: string; name: string; code: string };
type ClientRow = { id: string; name: string; email: string; status: "ACTIVE" | "INACTIVE"; roleName: string };

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const emptyAttachment = (): AttachmentDraft => ({ url: "", label: "" });

export function NewIssueForm({ onCreated, role }: { onCreated?: () => void; role: "ADMIN" | "CLIENT" }) {
  const router = useRouter();
  const isAdmin = role === "ADMIN";
  const [open, setOpen] = useState(false);
  const [organizationId, setOrganizationId] = useState("");
  const [reporterId, setReporterId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([emptyAttachment()]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: organizationData } = useSWR(isAdmin && open ? "/api/admin/organizations" : null, fetcher);
  const { data: clientData } = useSWR(isAdmin && organizationId ? `/api/admin/users?organizationId=${organizationId}` : null, fetcher);
  const organizations: OrganizationRow[] = organizationData?.organizations ?? [];
  const clients: ClientRow[] = (clientData?.users ?? []).filter((client: ClientRow) => client.roleName === "CLIENT" && client.status === "ACTIVE");


  const reset = () => {
    setOrganizationId("");
    setReporterId("");
    setTitle("");
    setDescription("");
    setAttachments([emptyAttachment()]);
    setErrors({});
  };

  const updateAttachment = (index: number, key: keyof AttachmentDraft, value: string) => {
    setAttachments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) => current.length === 1 ? [emptyAttachment()] : current.filter((_, itemIndex) => itemIndex !== index));
  };

  const submit = async () => {
    const parsed = createIssueSchema.safeParse({ title, description });

    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (isAdmin && !organizationId) {
      setErrors({ organizationId: "Organization is required." });
      return;
    }
    if (isAdmin && !reporterId) {
      setErrors({ reporterId: "Reported by client is required." });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const cleanAttachments = attachments.filter((attachment) => attachment.url.trim());
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          ...(isAdmin ? { organizationId, reporterId } : {}),
          attachments: cleanAttachments,
        }),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(result.message || "Unable to create issue");
        return;
      }

      toast.success(`${result.issue.ticketNo} created successfully`);
      setOpen(false);
      reset();
      onCreated?.();
      router.push(`/dashboard/issues/${result.issue.ticketNo}`);
    } catch {
      toast.error("Unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full rounded-full bg-blue-600 px-6 text-white hover:bg-blue-700 sm:w-auto">
          <Plus className="h-4 w-4" />
          Raise Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Raise Issue</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isAdmin ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label required className="mb-1">Organization</Label>
                <Select value={organizationId} onValueChange={(value) => { setOrganizationId(value); setReporterId(""); setErrors((prev) => ({ ...prev, organizationId: "" })); }}>
                  <SelectTrigger className={errors.organizationId ? "w-full border-red-500 focus-visible:ring-red-500" : "w-full"}>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.organizationId ? <p className="text-sm text-red-500">{errors.organizationId}</p> : null}
              </div>
              <div className="space-y-1">
                <Label required className="mb-1">Reported By Client</Label>
                <Select disabled={!organizationId} value={reporterId} onValueChange={(value) => { setReporterId(value); setErrors((prev) => ({ ...prev, reporterId: "" })); }}>
                  <SelectTrigger className={errors.reporterId ? "w-full border-red-500 focus-visible:ring-red-500" : "w-full"}>
                    <SelectValue placeholder={organizationId ? "Select client" : "Select organization first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.reporterId ? <p className="text-sm text-red-500">{errors.reporterId}</p> : null}
              </div>
            </div>
          ) : null}

          <div>
            <Label required className="mb-1">Title</Label>
            <Input
              placeholder="Enter issue title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setErrors((prev) => ({ ...prev, title: "" }));
              }}
              className={errors.title ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.title ? <p className="text-sm text-red-500">{errors.title}</p> : null}
          </div>

          <div>
            <Label required className="mb-1">Description</Label>
            <div className={errors.description ? "w-full min-w-0 rounded-lg border border-red-500" : "w-full min-w-0"}>
              <RichEditor
                value={description}
                onChange={(value) => {
                  setDescription(value);
                  setErrors((prev) => ({ ...prev, description: "" }));
                }}
                placeholder="Describe what happened, expected behavior, and steps to reproduce..."
                compact
              />
            </div>
            {errors.description ? <p className="text-sm text-red-500">{errors.description}</p> : null}
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
                <Input placeholder="Paste Jam, Lightshot, Drive, or reference link" value={attachment.url} onChange={(event) => updateAttachment(index, "url", event.target.value)} />
                <Input placeholder="Attachment label" value={attachment.label} onChange={(event) => updateAttachment(index, "label", event.target.value)} />
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
          <Button onClick={submit} disabled={isSubmitting} className="bg-blue-500 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? "Creating..." : "Create Issue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
