"use client";

import { FormEvent } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ResourceRow = Record<string, string | number | boolean | null | undefined> & {
  id: string;
};

export function SimpleAdminPage({
  title,
  endpoint,
  collection,
  fields,
}: {
  title: string;
  endpoint: string;
  collection: string;
  fields: { name: string; label: string; required?: boolean }[];
}) {
  const { data, mutate } = useSWR(endpoint, fetcher);
  const rows = data?.[collection] ?? [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return toast.error("Unable to save");
    toast.success("Saved");
    event.currentTarget.reset();
    mutate();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader><CardTitle>Add {title}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label>{field.label}</Label>
                <Input name={field.name} required={field.required} />
              </div>
            ))}
            <Button>Save</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {fields.map((field) => <TableHead key={field.name}>{field.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row: ResourceRow) => (
              <TableRow key={row.id}>
                {fields.map((field) => <TableCell key={field.name}>{row[field.name] || "-"}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export function UsersAdminPage() {
  const { data: usersData, mutate } = useSWR("/api/admin/users", fetcher);
  const { data: rolesData } = useSWR("/api/admin/roles", fetcher);
  const { data: orgsData } = useSWR("/api/admin/organizations", fetcher);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    if (!res.ok) return toast.error("Unable to create user");
    toast.success("Client created and set-password email sent");
    event.currentTarget.reset();
    mutate();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader><CardTitle>Create Client</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-2"><Label>Name</Label><Input name="name" required /></div>
            <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" required /></div>
            <div className="space-y-2"><Label>Phone</Label><Input name="phone" /></div>
            <div className="space-y-2"><Label>Designation</Label><Input name="designation" /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select name="roleId" required className="h-9 w-full rounded-md border bg-white px-3 text-sm">
                {(rolesData?.roles ?? []).map((role: ResourceRow) => (
                  <option key={role.id} value={role.id}>{role.roleName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Organization</Label>
              <select name="organizationId" className="h-9 w-full rounded-md border bg-white px-3 text-sm">
                <option value="">SRS Admin / No organization</option>
                {(orgsData?.organizations ?? []).map((org: ResourceRow) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
            <Button>Send invite</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(usersData?.users ?? []).map((user: ResourceRow) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.roleName}</TableCell>
                <TableCell>{user.organizationName || "SRS"}</TableCell>
                <TableCell>{user.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export function ModulesAdminPage() {
  const { data: moduleData, mutate } = useSWR("/api/admin/modules", fetcher);
  const { data: projectData } = useSWR("/api/admin/projects", fetcher);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/admin/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    if (!res.ok) return toast.error("Unable to save module");
    toast.success("Module saved");
    event.currentTarget.reset();
    mutate();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader><CardTitle>Add Module</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-2">
              <Label>Project</Label>
              <select name="projectId" required className="h-9 w-full rounded-md border bg-white px-3 text-sm">
                {(projectData?.projects ?? []).map((project: ResourceRow) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2"><Label>Name</Label><Input name="name" required /></div>
            <div className="space-y-2"><Label>Code</Label><Input name="code" required /></div>
            <div className="space-y-2"><Label>Description</Label><Input name="description" /></div>
            <Button>Save</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Name</TableHead><TableHead>Code</TableHead></TableRow></TableHeader>
          <TableBody>
            {(moduleData?.modules ?? []).map((item: ResourceRow) => (
              <TableRow key={item.id}><TableCell>{item.projectName}</TableCell><TableCell>{item.name}</TableCell><TableCell>{item.code}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
