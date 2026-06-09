"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import useSWR from "swr";
import { useRealtime } from "@/hooks/useRealtime";
import { ActionConfirmationDialog } from "@/components/commoncomponents/roles/action-confirmation-dialog";
import { ErrorAlertDialog } from "@/components/commoncomponents/roles/error-alert-dialog";
import {
  tableActionIconClassName,
  tableActionItemClassName,
  tableActionMenuContentClassName,
  tableActionRejectItemClassName,
  tableActionTriggerClassName,
} from "@/components/commoncomponents/table-action-menu-styles";
import TablePaginationFooter from "@/components/commoncomponents/table-pagination-footer";
import { TableStateRow } from "@/components/commoncomponents/table-state-row";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { moduleSchema } from "@/lib/validators/admin-config";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ProjectRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
};

type ModuleRow = {
  id: string;
  projectId: string;
  projectName: string | null;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
};

type FieldErrors = Record<string, string>;

export default function ModulesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tempSearch, setTempSearch] = useState(
    searchParams.get("search") ?? "",
  );
  const { data, mutate, isLoading } = useSWR(
    `/api/admin/modules?${searchParams.toString()}`,
    fetcher,
  );
  const { data: projectData, mutate: mutateProjects } = useSWR(
    "/api/admin/projects",
    fetcher,
  );
  useRealtime(["modules", "projects", "issues"], () => {
    void mutate(undefined, { revalidate: true });
    void mutateProjects(undefined, { revalidate: true });
  });
  const rows: ModuleRow[] = data?.modules ?? [];
  const nextCode: string = data?.nextCode ?? "";
  const projects: ProjectRow[] = useMemo(
    () => projectData?.projects ?? [],
    [projectData?.projects],
  );
  const pagination: PaginationMeta = data?.pagination ?? emptyPagination();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editing, setEditing] = useState<ModuleRow | null>(null);
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [initialState, setInitialState] = useState({
    projectId: "",
    name: "",
    description: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;
    if (!params.has("page")) {
      params.set("page", "1");
      changed = true;
    }
    if (!params.has("limit")) {
      params.set("limit", String(DEFAULT_PAGE_LIMIT));
      changed = true;
    }
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

  const projectOptions = useMemo(
    () =>
      projects.map((project) => (
        <SelectItem key={project.id} value={project.id}>
          {project.name}
        </SelectItem>
      )),
    [projects],
  );

  const hasChanges =
    !editing ||
    projectId !== initialState.projectId ||
    name !== initialState.name ||
    description !== initialState.description;

  const resetForm = () => {
    setProjectId("");
    setName("");
    setDescription("");
    setErrors({});
    setEditing(null);
    setInitialState({ projectId: "", name: "", description: "" });
  };

  const openEditor = (module?: ModuleRow) => {
    if (!module) {
      resetForm();
      setDialogOpen(true);
      return;
    }

    setEditing(module);
    setProjectId(module.projectId);
    setName(module.name);
    setDescription(module.description ?? "");
    setInitialState({
      projectId: module.projectId,
      name: module.name,
      description: module.description ?? "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const parsed = moduleSchema.safeParse({
      projectId,
      name,
      description,
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
      const res = await fetch(
        editing ? `/api/admin/modules/${editing.id}` : "/api/admin/modules",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, name, description }),
        },
      );
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(result.message || "Operation failed");
        return;
      }

      toast.success(
        editing ? "Module updated successfully" : "Module created successfully",
      );
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

  const confirmDelete = async () => {
    if (!editing?.id) return;

    try {
      const res = await fetch(`/api/admin/modules/${editing.id}`, {
        method: "DELETE",
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (result.message === "MODULE_IN_USE") setErrorOpen(true);
        else toast.error(result.message || "Delete failed");
        setDeleteConfirmOpen(false);
        return;
      }

      toast.success("Module deleted successfully");
      setDeleteConfirmOpen(false);
      resetForm();
      mutate();
    } catch {
      toast.error("Unexpected error occurred");
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <main className="p-6 bg-white min-h-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Module Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure project modules for support issue classification.
          </p>
        </div>
        <Button
          size="default"
          className="w-full rounded-full bg-blue-600 px-6 text-white hover:bg-blue-700 sm:w-auto"
          onClick={() => openEditor()}
        >
          <Plus className="h-5 w-5" />
          Create Module
        </Button>
      </div>

      <div className="mt-4 mb-4 flex flex-col gap-3 md:flex-row md:justify-between">
        <Input
          search
          type="search"
          placeholder="Search modules..."
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
              <TableHead className="whitespace-nowrap text-xs sm:text-sm">
                S.No
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs sm:text-sm">
                Project
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs sm:text-sm">
                Module Name
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs sm:text-sm">
                Code
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs sm:text-sm">
                Description
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableStateRow colSpan={6} type="loading" />
            ) : rows.length === 0 ? (
              <TableStateRow colSpan={6} type="empty" />
            ) : (
              rows.map((module, index) => (
                <TableRow key={module.id}>
                  <TableCell className="text-xs text-gray-600 sm:text-sm">
                    {(pagination.page - 1) * pagination.limit + index + 1}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-gray-700 sm:text-sm">
                    {module.projectName || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-gray-700 sm:text-sm">
                    {module.name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-gray-600 sm:text-sm">
                    {module.code}
                  </TableCell>
                  <TableCell
                    title={module.description || undefined}
                    className="max-w-[280px] text-xs text-gray-600 sm:text-sm"
                  >
                    {module.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={tableActionTriggerClassName}
                        >
                          <MoreHorizontal className={tableActionIconClassName} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className={tableActionMenuContentClassName}
                      >
                        <DropdownMenuItem
                          className={tableActionItemClassName}
                          onClick={() => openEditor(module)}
                        >
                          Update
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className={tableActionRejectItemClassName}
                          onClick={() => {
                            setEditing(module);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          Delete
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
            <DialogTitle>{editing ? "Update Module" : "Create Module"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label required className="mb-1">
                Project
              </Label>
              <Select
                value={projectId}
                onValueChange={(value) => {
                  setProjectId(value);
                  setErrors((prev) => ({ ...prev, projectId: "" }));
                }}
              >
                <SelectTrigger
                  className={
                    errors.projectId
                      ? "w-full border-red-500 focus:ring-red-500"
                      : "w-full"
                  }
                >
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>{projectOptions}</SelectContent>
              </Select>
              {errors.projectId && (
                <p className="text-sm text-red-500">{errors.projectId}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label required className="mb-1">
                Module Name
              </Label>
              <Input
                placeholder="Enter Module Name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setErrors((prev) => ({ ...prev, name: "" }));
                }}
                className={
                  errors.name
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="mb-1">Module Code</Label>
              <Input
                disabled
                value={editing?.code ?? nextCode}
                className="bg-slate-50 text-slate-500"
              />
            </div>
            <div className="space-y-1">
              <Label className="mb-1">Description</Label>
              <Input
                placeholder="Enter Description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !projectId ||
                !name.trim() ||
                (editing ? !hasChanges : false)
              }
              className="bg-blue-500 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? editing
                  ? "Updating..."
                  : "Creating..."
                : editing
                  ? "Update"
                  : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ActionConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={confirmSubmit}
        title={editing ? "Update Module" : "Create Module"}
        description="Are you sure?"
        isLoading={isSubmitting}
        keepOpenOnConfirm
      />
      <ActionConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Delete Module"
        description="This module will be permanently deleted."
      />
      <ErrorAlertDialog
        open={errorOpen}
        onOpenChange={setErrorOpen}
        title="Cannot Delete Module"
        description="This module is assigned to one or more issues."
      />
    </main>
  );
}
