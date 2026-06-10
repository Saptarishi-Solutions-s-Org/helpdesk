export const openStatuses = [
  "OPEN",
  "TRIAGED",
  "IN_PROGRESS",
  "WAITING_FROM_CLIENT",
  "REOPENED",
] as const;

export function isClosedStatus(status: string) {
  return status === "CLOSED" || status === "RESOLVED" || status === "CANCELLED";
}

export async function nextTicketNo(getLastTicketNo: () => Promise<string | null>) {
  const prefix = "SRS-HD";
  const lastTicketNo = await getLastTicketNo();
  const lastNumber = lastTicketNo?.startsWith(`${prefix}-`)
    ? Number(lastTicketNo.slice(prefix.length + 1))
    : 0;
  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;

  return `${prefix}-${String(nextNumber).padStart(6, "0")}`;
}
