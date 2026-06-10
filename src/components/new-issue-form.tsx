"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Plus } from "lucide-react";
import { toast } from "sonner";
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
import { createIssueSchema } from "@/lib/validators/issue";

type FieldErrors = Record<string, string>;

export function NewIssueForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentLabel, setAttachmentLabel] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
    setAttachmentUrl("");
    setAttachmentLabel("");
    setErrors({});
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

    setErrors({});
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(result.message || "Unable to create issue");
        return;
      }

      if (attachmentUrl.trim()) {
        const uploadRes = await fetch(`/api/issues/${result.issue.ticketNo}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: attachmentUrl,
            label: attachmentLabel,
          }),
        });

        if (!uploadRes.ok) {
          toast.warning("Issue created, but the attachment link could not be saved");
        }
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
      <DialogContent className="w-[calc(100vw-2rem)] overflow-x-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Raise Issue</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label required className="mb-1">
              Title
            </Label>
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
            <Label required className="mb-1">
              Description
            </Label>
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

          <div>
            <Label className="mb-1">Attachment Link</Label>
            <Input
              placeholder="Paste Jam, Lightshot, Drive, or reference link"
              value={attachmentUrl}
              onChange={(event) => setAttachmentUrl(event.target.value)}
            />
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" />
              Paste a public or team-accessible link. It will open in a new tab.
            </p>
          </div>
          <div>
            <Label className="mb-1">Attachment Label</Label>
            <Input
              placeholder="Example: Login screen recording"
              value={attachmentLabel}
              onChange={(event) => setAttachmentLabel(event.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={submit}
            disabled={isSubmitting}
            className="bg-blue-500 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Issue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
