"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import useSWR from "swr";
import { useRealtime } from "@/hooks/useRealtime";
import { ActionConfirmationDialog } from "@/components/commoncomponents/roles/action-confirmation-dialog";
import {
  tableActionIconClassName,
  tableActionItemClassName,
  tableActionMenuContentClassName,
  tableActionTriggerClassName,
} from "@/components/commoncomponents/table-action-menu-styles";
import TablePaginationFooter from "@/components/commoncomponents/table-pagination-footer";
import { TableStateRow } from "@/components/commoncomponents/table-state-row";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEFAULT_PAGE_LIMIT, emptyPagination, type PaginationMeta } from "@/lib/pagination";
import { internalUserSchema } from "@/lib/validators/admin-config";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type InternalUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  roleName: string;
  status: "ACTIVE" | "INACTIVE";
};

type FieldErrors = Record<string, string>;

export default function InternalTeamPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tempSearch, setTempSearch] = useState(searchParams.get("search") ?? "");
  const { data, mutate, isLoading } = useSWR(`/api/admin/internal-users?${searchParams.toString()}`, fetcher);
  const users: InternalUserRow[] = data?.users ?? [];
  const pagination: PaginationMeta = data?.pagination ?? emptyPagination();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<InternalUserRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [roleName, setRoleName] = useState<"DEVELOPER" | "QUALITY ANALYST" | "">("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [errors, setErrors] = useState<FieldErrors>({});

  useRealtime(["users", "roles"], () => {
    void mutate(undefined, { revalidate: true });
  });

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;
    if (!params.has("page")) { params.set("page", "1"); changed = true; }
    if (!params.has("limit")) { params.set("limit", String(DEFAULT_PAGE_LIMIT)); changed = true; }
    if (changed) router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const updateSearch = (nextSearch: string) => {
    setTempSearch(nextSearch);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    params.set("limit", params.get("limit") || String(DEFAULT_PAGE_LIMIT));
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    else params.delete("search");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const resetForm = () => {
    setName(""); setEmail(""); setPhone(""); setDesignation(""); setRoleName(""); setErrors({});
  };

  const openEdit = (user: InternalUserRow) => {
    setEditUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPhone(user.phone ?? "");
    setEditDesignation(user.designation ?? "");
    setEditStatus(user.status);
    setErrors({});
    setEditOpen(true);
  };

  const handleCreate = () => {
    const parsed = internalUserSchema.safeParse({ name, email, phone, designation, roleName });
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      parsed.error.issues.forEach((issue) => { fieldErrors[String(issue.path[0])] = issue.message; });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setConfirmOpen(true);
  };

  const confirmCreate = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/internal-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, designation, roleName }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(result.message || "Unable to create internal user"); return; }
      toast.success("Internal user created and set-password email sent");
      setConfirmOpen(false);
      setCreateOpen(false);
      resetForm();
      mutate();
    } catch { toast.error("Unexpected error occurred"); }
    finally { setIsSubmitting(false); }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    if (!editName.trim() || !editEmail.trim()) { toast.error("Name and email are required"); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/internal-users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone, designation: editDesignation, status: editStatus }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(result.message || "Unable to update user"); return; }
      toast.success("User updated");
      setEditOpen(false);
      mutate();
    } catch { toast.error("Unexpected error occurred"); }
    finally { setIsSubmitting(false); }
  };

  return (
    <main className="min-h-full bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Internal Team</h1>
          <p className="text-sm text-muted-foreground">Manage internal support users for developer and QA workflows.</p>
        </div>
        <Button className="w-full rounded-full bg-blue-600 px-6 text-white hover:bg-blue-700 sm:w-auto" onClick={() => { resetForm(); setCreateOpen(true); }}>
          <Plus className="h-4 w-4" /> Create Internal User
        </Button>
      </div>

      <div className="mb-4 mt-4 flex flex-col gap-3 md:flex-row md:justify-between">
        <Input search type="search" placeholder="Search internal team..." className="md:w-1/4" value={tempSearch} onChange={(event) => updateSearch(event.target.value)} />
      </div>

      <TablePaginationFooter pagination={pagination} variant="top" />
      <div className="rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-[#7677F41A]">
            <TableRow>
              <TableHead>S.No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableStateRow colSpan={8} type="loading" />
            ) : users.length === 0 ? (
              <TableStateRow colSpan={8} type="empty" />
            ) : users.map((user, index) => (
              <TableRow key={user.id}>
                <TableCell>{(pagination.page - 1) * pagination.limit + index + 1}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone || "Not provided"}</TableCell>
                <TableCell>{user.designation || "Not provided"}</TableCell>
                <TableCell>{user.roleName}</TableCell>
                <TableCell><span className={user.status === "ACTIVE" ? "text-green-600" : "text-gray-500"}>{user.status}</span></TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className={tableActionTriggerClassName}>
                        <MoreHorizontal className={tableActionIconClassName} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className={tableActionMenuContentClassName}>
                      <DropdownMenuItem className={tableActionItemClassName} onClick={() => openEdit(user)}>
                        Update
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePaginationFooter pagination={pagination} variant="bottom" />
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Internal User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label required className="mb-1">Role</Label>
              <Select value={roleName} onValueChange={(value) => { setRoleName(value as "DEVELOPER" | "QUALITY ANALYST"); setErrors((prev) => ({ ...prev, roleName: "" })); }}>
                <SelectTrigger className={errors.roleName ? "w-full border-red-500 focus-visible:ring-red-500" : "w-full"}><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEVELOPER">Developer</SelectItem>
                  <SelectItem value="QUALITY ANALYST">Quality Analyst</SelectItem>
                </SelectContent>
              </Select>
              {errors.roleName && <p className="text-sm text-red-500">{errors.roleName}</p>}
            </div>
            <div className="space-y-1">
              <Label required className="mb-1">Name</Label>
              <Input placeholder="Enter Name" value={name} onChange={(event) => { setName(event.target.value); setErrors((prev) => ({ ...prev, name: "" })); }} className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""} />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>
            <div className="space-y-1">
              <Label required className="mb-1">Email</Label>
              <Input placeholder="Enter Email" value={email} onChange={(event) => { setEmail(event.target.value); setErrors((prev) => ({ ...prev, email: "" })); }} className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""} />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>
            <div className="space-y-1"><Label className="mb-1">Phone</Label><Input placeholder="Enter Phone" value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
            <div className="space-y-1"><Label className="mb-1">Designation</Label><Input placeholder="Enter Designation" value={designation} onChange={(event) => setDesignation(event.target.value)} /></div>
          </div>
          <div className="flex justify-end"><Button onClick={handleCreate} disabled={isSubmitting || !name.trim() || !email.trim() || !roleName} className="bg-blue-500 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? "Creating..." : "Create"}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Internal User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label required className="mb-1">Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label required className="mb-1">Email</Label>
              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-1"><Label className="mb-1">Phone</Label><Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} /></div>
            <div className="space-y-1"><Label className="mb-1">Designation</Label><Input value={editDesignation} onChange={(e) => setEditDesignation(e.target.value)} /></div>
            <div className="space-y-1">
              <Label required className="mb-1">Status</Label>
              <Select value={editStatus} onValueChange={(value) => setEditStatus(value as "ACTIVE" | "INACTIVE")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isSubmitting} className="bg-blue-500 text-white hover:bg-blue-600">{isSubmitting ? "Saving..." : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ActionConfirmationDialog open={confirmOpen} onOpenChange={setConfirmOpen} onConfirm={confirmCreate} title="Create Internal User" description="Create this internal user and send the set-password email?" isLoading={isSubmitting} keepOpenOnConfirm />
    </main>
  );
}
