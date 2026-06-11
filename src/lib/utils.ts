import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const enumLabelMap: Record<string, string> = {
  CR: "CR",
  BUG: "Bug",
  ISSUE: "Issue",
  SERVICE_REQUEST: "Service Request",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
  BLOCKER: "Blocker",
  ADMIN: "Admin",
  CLIENT: "Client",
  DEVELOPER: "Developer",
  QUALITY_ANALYST: "Quality Analyst",
  QUALITY: "Quality",
  ANALYST: "Analyst",
  WAITING_FOR_SUPPORT: "Waiting for Support",
  BACKLOG: "Backlog",
  IN_ANALYSIS: "In Analysis",
  IN_PROGRESS: "In Progress",
  WAITING_FROM_CLIENT: "Waiting from Client",
  WAITING_FOR_USER: "Waiting from Client",
  QUEUED_FOR_RELEASE: "Queued for Release",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  CANCELLED: "Cancelled",
  OPEN: "Open",
  TRIAGED: "Triaged",
  NEW: "New",
  ACCEPTED: "Accepted",
  DEV_IN_PROGRESS: "Dev In Progress",
  DEV_REVIEW: "Dev Review",
  READY_FOR_QA: "Ready for QA",
  QA_IN_PROGRESS: "QA In Progress",
  READY_FOR_PRODUCTION: "Ready for Production",
  COMMENT_ADDED: "Comment Added",
  COMMENT_DELETED: "Comment Deleted",
  STATUS_CHANGED: "Status Changed",
  ISSUE_CREATED: "Issue Created",
  ISSUE_ASSIGNED: "Issue Assigned",
  ISSUE_REOPENED: "Issue Reopened",
  WORKLOG_STARTED: "Worklog Started",
  WORKLOG_STOPPED: "Worklog Stopped",
  WORKLOG_AUTO_STOPPED: "Worklog Auto Stopped",
};

export function formatStatus(status: string) {
  const normalized = status.trim().toUpperCase().replace(/\s+/g, "_");
  if (enumLabelMap[normalized]) return enumLabelMap[normalized];
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatEnumText(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/\b[A-Z]+(?:_[A-Z]+)+\b/g, (match) => formatStatus(match))
    .replace(/\b(BUG|ISSUE|CR|LOW|MEDIUM|HIGH|CRITICAL|BLOCKER|ADMIN|CLIENT|DEVELOPER)\b/g, (match) => formatStatus(match))
    .replace(/\bQUALITY ANALYST\b/g, "Quality Analyst");
}