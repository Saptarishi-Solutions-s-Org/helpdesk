import { SimpleAdminPage } from "@/components/admin-resource-page";

export default function ProjectsPage() {
  return (
    <SimpleAdminPage
      title="Project"
      endpoint="/api/admin/projects"
      collection="projects"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "code", label: "Code", required: true },
        { name: "description", label: "Description" },
      ]}
    />
  );
}
