import { SimpleAdminPage } from "@/components/admin-resource-page";

export default function RolesPage() {
  return (
    <SimpleAdminPage
      title="Role"
      endpoint="/api/admin/roles"
      collection="roles"
      fields={[
        { name: "roleName", label: "Role Name", required: true },
        { name: "description", label: "Description" },
      ]}
    />
  );
}
