import { IssueDetailClient } from "@/components/issue-detail-client";
import { getSessionUser } from "@/lib/auth";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  const { id } = await params;
  return <IssueDetailClient id={id} role={user?.role ?? "USER"} />;
}
