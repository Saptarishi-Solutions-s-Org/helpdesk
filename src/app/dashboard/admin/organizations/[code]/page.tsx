"use client";

import { useState } from "react";
import { AlertTriangle, ArrowLeft, Save, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWR from "swr";
import { useRealtime } from "@/hooks/useRealtime";
import GlobalLoader from "@/components/commoncomponents/globalloader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { organizationSchema } from "@/lib/validators/admin-config";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Organization = {
  id: string;
  name: string;
  code: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: "ACTIVE" | "INACTIVE";
};

type FieldErrors = Record<string, string>;

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const endpoint = `/api/admin/organizations/${params.code}`;
  const { data, mutate, isLoading } = useSWR(endpoint, fetcher);
  const organization: Organization | undefined = data?.organization;
  const stats = data?.stats ?? { users: 0, issues: 0, openIssues: 0, closedIssues: 0 };
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [errors, setErrors] = useState<FieldErrors>({});

  useRealtime(["organizations", "users", "issues"], () => {
    void mutate(undefined, { revalidate: true });
  });

  const save = async () => {
    const parsed = organizationSchema.safeParse({
      name,
      contactEmail,
      contactPhone,
      status,
    });

    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contactEmail, contactPhone, status }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(result.message || "Unable to update organization");
        return;
      }
      toast.success("Organization updated successfully");
      setIsEditing(false);
      mutate();
    } catch {
      toast.error("Unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
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
    <main className="p-6 bg-white min-h-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/admin/organizations")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{organization.name}</h1>
            <p className="text-sm text-muted-foreground">{organization.code}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => router.push(`/dashboard/admin/organizations/${organization.code}/users`)}
          >
            <Users className="h-4 w-4" />
            Users
          </Button>
          {isEditing ? (
            <Button
              onClick={save}
              disabled={isSaving || !name.trim()}
              className="rounded-full bg-blue-600 text-white hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          ) : (
            <Button
              className="rounded-full bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => {
                setName(organization.name);
                setContactEmail(organization.contactEmail ?? "");
                setContactPhone(organization.contactPhone ?? "");
                setStatus(organization.status);
                setErrors({});
                setIsEditing(true);
              }}
            >
              Edit Organization
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Users", stats.users],
          ["Issues", stats.issues],
          ["Open Issues", stats.openIssues],
          ["Closed Issues", stats.closedIssues],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label required className="mb-1">Organization Name</Label>
            <Input
              disabled={!isEditing}
              value={isEditing ? name : organization.name}
              onChange={(event) => {
                setName(event.target.value);
                setErrors((prev) => ({ ...prev, name: "" }));
              }}
              className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label className="mb-1">Organization Code</Label>
            <Input disabled value={organization.code} className="bg-slate-50 text-slate-500" />
          </div>
          <div className="space-y-1">
            <Label className="mb-1">Contact Email</Label>
            <Input
              disabled={!isEditing}
              value={isEditing ? contactEmail : organization.contactEmail ?? "Not provided"}
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
              disabled={!isEditing}
              value={isEditing ? contactPhone : organization.contactPhone ?? "Not provided"}
              onChange={(event) => setContactPhone(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label required className="mb-1">Status</Label>
            <Select
              disabled={!isEditing}
              value={isEditing ? status : organization.status}
              onValueChange={(value) => setStatus(value as "ACTIVE" | "INACTIVE")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="INACTIVE">INACTIVE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </main>
  );
}
