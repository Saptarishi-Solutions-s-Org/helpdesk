import { IssueDetailClient } from "@/components/issue-detail-client";
import { getSessionUser } from "@/lib/auth";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ ticketNo: string }>;
}) {
  const user = await getSessionUser();
  const { ticketNo } = await params;
  return <IssueDetailClient id={ticketNo} role={user?.role ?? "USER"} />;
}
