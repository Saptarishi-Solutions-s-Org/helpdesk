import { SimpleAdminPage } from "@/components/admin-resource-page";

export default function OrganizationsPage() {
  return (
    <SimpleAdminPage
      title="Organization"
      endpoint="/api/admin/organizations"
      collection="organizations"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "code", label: "Code", required: true },
        { name: "contactEmail", label: "Contact Email" },
        { name: "contactPhone", label: "Contact Phone" },
      ]}
    />
  );
}
