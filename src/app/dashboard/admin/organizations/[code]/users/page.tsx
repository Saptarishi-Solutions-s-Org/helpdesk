"use client";

import { useState } from "react";
import { AlertTriangle, ArrowLeft, MoreHorizontal, UserPlus } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import GlobalLoader from "@/components/commoncomponents/globalloader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEFAULT_PAGE_LIMIT,
  emptyPagination,
  type PaginationMeta,
} from "@/lib/pagination";
import { userSchema } from "@/lib/validators/admin-config";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type UserRow = {
  id: string;
  organizationId: string | null;
  roleId: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  status: "ACTIVE" | "INACTIVE";
  organizationName: string | null;
  roleName: string;
};

type OrganizationPayload = {
  organization?: {
    id: string;
    name: string;
    code: string;
  };
};

type FieldErrors = Record<string, string>;

export default function OrganizationUsersPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const organizationCode = params.code;
  const page = searchParams.get("page") || "1";
  const limit = searchParams.get("limit") || String(DEFAULT_PAGE_LIMIT);
  const search = searchParams.get("search") ?? "";
  const [tempSearch, setTempSearch] = useState(search);
  const { data: orgData, mutate: mutateOrg, isLoading: isOrgLoading } = useSWR<OrganizationPayload>(
    `/api/admin/organizations/${organizationCode}`,
    fetcher,
  );
  const organization = orgData?.organization;
  const organizationId = organization?.id ?? "";
  const usersEndpoint = organizationId
    ? `/api/admin/users?organizationId=${organizationId}&page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`
    : null;
  const { data, mutate, isLoading } = useSWR(usersEndpoint, fetcher);
  const users: UserRow[] = data?.users ?? [];
  const pagination: PaginationMeta = data?.pagination ?? emptyPagination();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  useRealtime(["users", "roles", "organizations"], () => {
    void mutate(undefined, { revalidate: true });
    void mutateOrg(undefined, { revalidate: true });
  });

  const updateSearch = (nextSearch: string) => {
    setTempSearch(nextSearch);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("page", "1");
    nextParams.set("limit", nextParams.get("limit") || String(DEFAULT_PAGE_LIMIT));
    if (nextSearch.trim()) nextParams.set("search", nextSearch.trim());
    else nextParams.delete("search");
    const query = nextParams.toString();
    router.replace(
      `/dashboard/admin/organizations/${organizationCode}/users${query ? `?${query}` : ""}`,
    );
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setDesignation("");
    setErrors({});
  };

  const handleSubmit = () => {
    const parsed = userSchema.safeParse({
      organizationId,
      name,
      email,
      phone,
      designation,
    });

    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setConfirmOpen(true);
  };

  const confirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          name,
          email,
          phone,
          designation,
        }),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(result.message || "Unable to create user");
        return;
      }

      toast.success("User created and set-password email sent");
      setConfirmOpen(false);
      setDialogOpen(false);
      resetForm();
      mutate();
    } catch {
      toast.error("Unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isOrgLoading) {
    return <GlobalLoader />;
  }

  if (!organization) {
    return (
      <main className="flex min-h-full items-center justify-center bg-white p-6">
        <div className="w-full max-w-md rounded-lg border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Organization not found</h1>
          <p className="mt-2 text-sm text-gray-500">
            The organization code does not match any configured organization.
          </p>
          <Button
            className="mt-6 rounded-full bg-blue-600 px-6 text-white hover:bg-blue-700"
            onClick={() => router.push("/dashboard/admin/organizations")}
          >
            Back to Organizations
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/admin/organizations/${organization.code}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {organization.name} User Management
            </h1>
            <p className="text-sm text-muted-foreground">
              {organization.code} users and invites.
            </p>
          </div>
        </div>
        <Button
          size="default"
          className="w-full rounded-full bg-blue-600 px-6 text-white hover:bg-blue-700 sm:w-auto"
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <UserPlus className="h-4 w-4" />
          Create User
        </Button>
      </div>

      <div className="mb-4 mt-4 flex flex-col gap-3 md:flex-row md:justify-between">
        <Input
          search
          type="search"
          placeholder="Search users..."
          className="md:w-1/4"
          value={tempSearch}
          onChange={(event) => updateSearch(event.target.value)}
        />
      </div>

      <TablePaginationFooter pagination={pagination} variant="top" />
      <div className="rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-[#7677F41A]">
            <TableRow>
              <TableHead className="text-xs sm:text-sm">S.No</TableHead>
              <TableHead className="text-xs sm:text-sm">Name</TableHead>
              <TableHead className="text-xs sm:text-sm">Email</TableHead>
              <TableHead className="text-xs sm:text-sm">Phone</TableHead>
              <TableHead className="text-xs sm:text-sm">Designation</TableHead>
              <TableHead className="text-xs sm:text-sm">Role</TableHead>
              <TableHead className="text-xs sm:text-sm">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableStateRow colSpan={8} type="loading" />
            ) : users.length === 0 ? (
              <TableStateRow colSpan={8} type="empty" />
            ) : (
              users.map((user, index) => (
                <TableRow key={user.id}>
                  <TableCell className="text-xs text-gray-600 sm:text-sm">
                    {(pagination.page - 1) * pagination.limit + index + 1}
                  </TableCell>
                  <TableCell className="text-xs text-gray-700 sm:text-sm">
                    {user.name}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600 sm:text-sm">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600 sm:text-sm">
                    {user.phone || "Not provided"}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600 sm:text-sm">
                    {user.designation || "Not provided"}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600 sm:text-sm">
                    {user.roleName}
                  </TableCell>
                  <TableCell>
                    <span className={user.status === "ACTIVE" ? "text-green-600" : "text-gray-500"}>
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className={tableActionTriggerClassName}>
                          <MoreHorizontal className={tableActionIconClassName} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className={tableActionMenuContentClassName}>
                        <DropdownMenuItem className={tableActionItemClassName}>
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePaginationFooter pagination={pagination} variant="bottom" />
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label required className="mb-1">Organization</Label>
              <Input disabled value={organization.name} className="bg-slate-50 text-slate-500" />
            </div>
            <div className="space-y-1">
              <Label required className="mb-1">Name</Label>
              <Input
                placeholder="Enter Name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setErrors((prev) => ({ ...prev, name: "" }));
                }}
                className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>
            <div className="space-y-1">
              <Label required className="mb-1">Email</Label>
              <Input
                placeholder="Enter Email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrors((prev) => ({ ...prev, email: "" }));
                }}
                className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>
            <div className="space-y-1">
              <Label className="mb-1">Phone</Label>
              <Input
                placeholder="Enter Phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="mb-1">Designation</Label>
              <Input
                placeholder="Enter Designation"
                value={designation}
                onChange={(event) => setDesignation(event.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim() || !email.trim()}
              className="bg-blue-500 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ActionConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={confirmSubmit}
        title="Create User"
        description="Create this user and send the set-password email?"
        isLoading={isSubmitting}
        keepOpenOnConfirm
      />
    </main>
  );
}
