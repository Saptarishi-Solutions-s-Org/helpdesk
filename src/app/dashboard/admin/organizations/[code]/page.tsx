"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Link2, Save, Trash2, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWR from "swr";
import { useRealtime } from "@/hooks/useRealtime";
import GlobalLoader from "@/components/commoncomponents/globalloader";
import { NotFoundCard } from "@/components/commoncomponents/not-found-card";
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
  shortCode: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: "ACTIVE" | "INACTIVE";
};

type ProjectLink = {
  id: string;
  name: string;
  code: string;
  shortCode: string;
  isActive: boolean;
};

type FieldErrors = Record<string, string>;

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const endpoint = `/api/admin/organizations/${params.code}`;
  const projectsEndpoint = `/api/admin/organizations/${params.code}/projects`;
  const { data, mutate, isLoading } = useSWR(endpoint, fetcher);
  const { data: projectData, mutate: mutateProjects } = useSWR(projectsEndpoint, fetcher);
  const organization: Organization | undefined = data?.organization;
  const stats = data?.stats ?? { users: 0, issues: 0, openIssues: 0, closedIssues: 0 };
  const linkedProjects: ProjectLink[] = useMemo(() => projectData?.linkedProjects ?? [], [projectData?.linkedProjects]);
  const availableProjects: ProjectLink[] = useMemo(() => projectData?.availableProjects ?? [], [projectData?.availableProjects]);
  const linkedProjectIds = useMemo(() => new Set(linkedProjects.map((project) => project.id)), [linkedProjects]);
  const selectableProjects = availableProjects.filter((project) => !linkedProjectIds.has(project.id));
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [errors, setErrors] = useState<FieldErrors>({});

  useRealtime(["organizations", "users", "issues", "organization_projects", "projects"], () => {
    void mutate(undefined, { revalidate: true });
    void mutateProjects(undefined, { revalidate: true });
  });

  const save = async () => {
    const parsed = organizationSchema.safeParse({ name, shortCode, contactEmail, contactPhone, status });

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
        body: JSON.stringify({ name, shortCode, contactEmail, contactPhone, status }),
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

  const linkProject = async () => {
    if (!selectedProjectId) return;
    setIsLinking(true);
    try {
      const res = await fetch(projectsEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectIds: [selectedProjectId] }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(result.message || "Unable to link project");
        return;
      }
      toast.success("Project linked successfully");
      setSelectedProjectId("");
      mutateProjects();
    } catch {
      toast.error("Unexpected error occurred");
    } finally {
      setIsLinking(false);
    }
  };

  const unlinkProject = async (projectId: string) => {
    try {
      const res = await fetch(`${projectsEndpoint}/${projectId}`, { method: "DELETE" });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(result.message || "Unable to unlink project");
        return;
      }
      toast.success("Project unlinked successfully");
      mutateProjects();
    } catch {
      toast.error("Unexpected error occurred");
    }
  };

  if (isLoading) return <GlobalLoader />;

  if (!organization) {
    return (
      <NotFoundCard
        title="Organization not found"
        description="The organization code does not match any configured organization."
        actionHref="/dashboard/admin/organizations"
        actionLabel="Back to Organizations"
      />
    );
  }

  return (
    <main className="min-h-full bg-white p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/admin/organizations")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{organization.name}</h1>
            <p className="text-sm text-muted-foreground">{organization.code} | {organization.shortCode}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => router.push(`/dashboard/admin/organizations/${organization.code}/users`)}>
            <Users className="h-4 w-4" />
            Clients
          </Button>
          {isEditing ? (
            <Button onClick={save} disabled={isSaving || !name.trim() || !shortCode.trim()} className="rounded-full bg-blue-600 text-white hover:bg-blue-700">
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          ) : (
            <Button className="rounded-full bg-blue-600 text-white hover:bg-blue-700" onClick={() => {
              setName(organization.name);
              setShortCode(organization.shortCode);
              setContactEmail(organization.contactEmail ?? "");
              setContactPhone(organization.contactPhone ?? "");
              setStatus(organization.status);
              setErrors({});
              setIsEditing(true);
            }}>Edit Organization</Button>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Clients", stats.users], ["Issues", stats.issues], ["Open Issues", stats.openIssues], ["Closed Issues", stats.closedIssues]].map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label required className="mb-1">Organization Name</Label>
              <Input disabled={!isEditing} value={isEditing ? name : organization.name} onChange={(event) => { setName(event.target.value); setErrors((prev) => ({ ...prev, name: "" })); }} className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""} />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>
            <div className="space-y-1">
              <Label required className="mb-1">Short Code</Label>
              <Input disabled={!isEditing} maxLength={3} value={isEditing ? shortCode : organization.shortCode} onChange={(event) => { setShortCode(event.target.value.toUpperCase()); setErrors((prev) => ({ ...prev, shortCode: "" })); }} className={errors.shortCode ? "border-red-500 focus-visible:ring-red-500" : ""} />
              {errors.shortCode && <p className="text-sm text-red-500">{errors.shortCode}</p>}
            </div>
            <div className="space-y-1">
              <Label className="mb-1">Organization Code</Label>
              <Input disabled value={organization.code} className="bg-slate-50 text-slate-500" />
            </div>
            <div className="space-y-1">
              <Label className="mb-1">Contact Email</Label>
              <Input disabled={!isEditing} value={isEditing ? contactEmail : organization.contactEmail ?? "Not provided"} onChange={(event) => { setContactEmail(event.target.value); setErrors((prev) => ({ ...prev, contactEmail: "" })); }} className={errors.contactEmail ? "border-red-500 focus-visible:ring-red-500" : ""} />
              {errors.contactEmail && <p className="text-sm text-red-500">{errors.contactEmail}</p>}
            </div>
            <div className="space-y-1">
              <Label className="mb-1">Contact Phone</Label>
              <Input disabled={!isEditing} value={isEditing ? contactPhone : organization.contactPhone ?? "Not provided"} onChange={(event) => setContactPhone(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label required className="mb-1">Status</Label>
              <Select disabled={!isEditing} value={isEditing ? status : organization.status} onValueChange={(value) => setStatus(value as "ACTIVE" | "INACTIVE")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Linked Projects</h2>
              <p className="text-sm text-muted-foreground">Used for ticket numbering and issue triage.</p>
            </div>
            <Link2 className="h-5 w-5 text-blue-600" />
          </div>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {selectableProjects.length === 0 ? <SelectItem value="none" disabled>No projects available</SelectItem> : selectableProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name} ({project.shortCode})</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="rounded-full bg-blue-600 text-white hover:bg-blue-700" disabled={!selectedProjectId || isLinking} onClick={linkProject}>{isLinking ? "Linking..." : "Link"}</Button>
          </div>
          <div className="space-y-2">
            {linkedProjects.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No projects linked yet.</div>
            ) : linkedProjects.map((project) => (
              <div key={project.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{project.name}</p>
                  <p className="text-xs text-muted-foreground">{project.code} | {project.shortCode}</p>
                </div>
                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => unlinkProject(project.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
