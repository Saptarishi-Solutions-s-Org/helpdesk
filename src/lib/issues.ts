export const openStatuses = [
  "OPEN",
  "TRIAGED",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "REOPENED",
] as const;

export function isClosedStatus(status: string) {
  return status === "CLOSED" || status === "RESOLVED" || status === "CANCELLED";
}

export function nextTicketNo() {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `HD-${y}${m}-${suffix}`;
}
