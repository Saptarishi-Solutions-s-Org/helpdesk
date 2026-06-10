"use client";

import { useEffect, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import useSWR from "swr";
import { useRealtime } from "@/hooks/useRealtime";
import GlobalLoader from "@/components/commoncomponents/globalloader";
import { ActionConfirmationDialog } from "@/components/commoncomponents/roles/action-confirmation-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { organizationSchema } from "@/lib/validators/admin-config";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type OrganizationRow = {
  id: string;
  name: string;
  code: string;
  shortCode: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: "ACTIVE" | "INACTIVE";
  totalUsers: number;
  totalIssues: number;
  openIssues: number;
  closedIssues: number;
};

type FieldErrors = Record<string, string>;

export default function OrganizationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tempSearch, setTempSearch] = useState(searchParams.get("search") ?? "");
  const { data, mutate, isLoading } = useSWR(
    `/api/admin/organizations${searchParams.get("search") ? `?search=${encodeURIComponent(searchParams.get("search") ?? "")}` : ""}`,
    fetcher,
  );
  const rows: OrganizationRow[] = data?.organizations ?? [];
  const nextCode: string = data?.nextCode ?? "";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [navigatingCode, setNavigatingCode] = useState("");

  useRealtime(["organizations", "users", "issues"], () => {
    void mutate(undefined, { revalidate: true });
  });

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;
    if (params.has("page")) {
      params.delete("page");
      changed = true;
    }
    if (params.has("limit")) {
      params.delete("limit");
      changed = true;
    }
    if (changed) router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const updateSearch = (nextSearch: string) => {
    setTempSearch(nextSearch);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("limit");
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    else params.delete("search");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const resetForm = () => {
    setName("");
    setShortCode("");
    setContactEmail("");
    setContactPhone("");
    setErrors({});
  };

  const openOrganization = (code: string) => {
    if (navigatingCode) return;
    setNavigatingCode(code);
    router.push(`/dashboard/admin/organizations/${code}`);
  };

  const handleSubmit = () => {
    const parsed = organizationSchema.safeParse({
      name,
      shortCode,
      contactEmail,
      contactPhone,
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
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, shortCode, contactEmail, contactPhone }),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(result.message || "Unable to create organization");
        return;
      }

      toast.success("Organization created successfully");
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

  return (
    <main className="p-6 bg-white min-h-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Organization Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Create client organizations and manage their support users.
          </p>
        </div>
        <Button
          size="default"
          className="w-full rounded-full bg-blue-600 px-6 text-white hover:bg-blue-700 sm:w-auto"
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="h-5 w-5" />
          Create Organization
        </Button>
      </div>

      <div className="mt-4 mb-4 flex flex-col gap-3 md:flex-row md:justify-between">
        <Input
          search
          type="search"
          placeholder="Search organizations..."
          className="md:w-1/4"
          value={tempSearch}
          onChange={(event) => updateSearch(event.target.value)}
        />
      </div>

      {isLoading ? (
        <GlobalLoader />
      ) : rows.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500 shadow-sm">
          No records found.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((org) => (
            <div
              key={org.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  disabled={Boolean(navigatingCode)}
                  onClick={() => openOrganization(org.code)}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold text-gray-900">
                      {org.name}
                    </span>
                    <span className="mt-1 block text-xs font-medium text-gray-500">
                      {org.code} | {org.shortCode}
                    </span>
                  </span>
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <span
                  className={
                    org.status === "ACTIVE"
                      ? "text-sm font-medium text-green-600"
                      : "text-sm font-medium text-gray-500"
                  }
                >
                  {org.status}
                </span>
                <span className="text-xs text-gray-500">
                  {navigatingCode === org.code ? "Opening..." : "Open"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label required className="mb-1">Organization Name</Label>
              <Input
                placeholder="Enter Organization Name"
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
              <Label required className="mb-1">Short Code</Label>
              <Input
                placeholder="2-3 characters, e.g. ABC"
                value={shortCode}
                maxLength={3}
                onChange={(event) => {
                  setShortCode(event.target.value.toUpperCase());
                  setErrors((prev) => ({ ...prev, shortCode: "" }));
                }}
                className={errors.shortCode ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.shortCode && <p className="text-sm text-red-500">{errors.shortCode}</p>}
            </div>
            <div className="space-y-1">
              <Label className="mb-1">Organization Code</Label>
              <Input disabled value={nextCode} className="bg-slate-50 text-slate-500" />
            </div>
            <div className="space-y-1">
              <Label className="mb-1">Contact Email</Label>
              <Input
                placeholder="Enter Contact Email"
                value={contactEmail}
                onChange={(event) => {
                  setContactEmail(event.target.value);
                  setErrors((prev) => ({ ...prev, contactEmail: "" }));
                }}
                className={errors.contactEmail ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.contactEmail && <p className="text-sm text-red-500">{errors.contactEmail}</p>}
            </div>
            <div className="space-y-1">
              <Label className="mb-1">Contact Phone</Label>
              <Input
                placeholder="Enter Contact Phone"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim() || !shortCode.trim()}
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
        title="Create Organization"
        description="Are you sure?"
        isLoading={isSubmitting}
        keepOpenOnConfirm
      />
    </main>
  );
}
