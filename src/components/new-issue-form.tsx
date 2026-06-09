"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RichEditor } from "@/components/rich-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function NewIssueForm() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [type, setType] = useState("BUG");
  const [priority, setPriority] = useState("MEDIUM");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        type,
        priority,
        description,
      }),
    });
    if (!res.ok) {
      toast.error((await res.json()).message || "Unable to create issue");
      return;
    }
    const data = await res.json();
    const files = form.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
    if (files.length) {
      const uploadForm = new FormData();
      files.forEach((file) => uploadForm.append("files", file));
      const uploadRes = await fetch(`/api/issues/${data.issue.id}/attachments`, {
        method: "POST",
        body: uploadForm,
      });
      if (!uploadRes.ok) {
        toast.warning("Issue created, but some attachments could not upload");
      }
    }
    toast.success("Issue created");
    router.push(`/dashboard/issues/${data.issue.id}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Raise Bug / CR</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-3">
              <Label>Title</Label>
              <Input name="title" required placeholder="Short summary" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUG">Bug</SelectItem>
                  <SelectItem value="CR">CR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <RichEditor value={description} onChange={setDescription} />
          </div>
          <div className="space-y-2">
            <Label>Images / Videos / Files</Label>
            <Input
              name="files"
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Add screenshots, screen recordings, or supporting documents.
            </p>
          </div>
          <Button>Create issue</Button>
        </form>
      </CardContent>
    </Card>
  );
}
