import { NotFoundCard } from "@/components/commoncomponents/not-found-card";

export default function OrganizationNotFound() {
  return (
    <NotFoundCard
      title="Organization not found"
      description="The organization code does not match any configured organization."
      actionHref="/dashboard/admin/organizations"
      actionLabel="Back to Organizations"
    />
  );
}
