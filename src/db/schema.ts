import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const organizationStatusEnum = pgEnum("organization_status", [
  "ACTIVE",
  "INACTIVE",
]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "INACTIVE"]);
export const issueTypeEnum = pgEnum("issue_type", [
  "BUG",
  "CR",
  "ISSUE",
  "SERVICE_REQUEST",
  "EPIC",
  "TASK",
  "SUBTASK",
  "IMPROVEMENT",
  "FEATURE",
  "DOCUMENTATION",
]);
export const issuePriorityEnum = pgEnum("issue_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
  "BLOCKER",
]);
export const issueStatusEnum = pgEnum("issue_status", [
  "OPEN",
  "TRIAGED",
  "WAITING_FOR_SUPPORT",
  "BACKLOG",
  "IN_ANALYSIS",
  "IN_PROGRESS",
  "WAITING_FROM_CLIENT",
  "QUEUED_FOR_RELEASE",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
]);
export const attachmentResourceEnum = pgEnum("attachment_resource", [
  "image",
  "video",
  "file",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "ISSUE_CREATED",
  "ISSUE_ASSIGNED",
  "COMMENT_ADDED",
  "STATUS_CHANGED",
  "ISSUE_CLOSED",
  "ISSUE_REOPENED",
]);
export const internalTicketStatusEnum = pgEnum("internal_ticket_status", [
  "NEW",
  "ACCEPTED",
  "DEV_IN_PROGRESS",
  "DEV_REVIEW",
  "READY_FOR_QA",
  "QA_IN_PROGRESS",
  "READY_FOR_PRODUCTION",
  "REOPENED",
]);

export const coreTicketStatusEnum = pgEnum("core_ticket_status", [
  "OPEN",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
  "NEW",
  "ACCEPTED",
  "DEV_IN_PROGRESS",
  "DEV_REVIEW",
  "READY_FOR_QA",
  "QA_IN_PROGRESS",
  "READY_FOR_PRODUCTION",
  "REOPENED",
]);

export const coreTicketLinkTypeEnum = pgEnum("core_ticket_link_type", [
  "RELATES_TO",
  "BLOCKS",
  "IS_BLOCKED_BY",
  "DUPLICATES",
  "IS_DUPLICATED_BY",
]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 90 }).notNull(),
    code: varchar("code", { length: 20 }).notNull(),
    shortCode: varchar("short_code", { length: 3 }).notNull(),
    contactEmail: varchar("contact_email", { length: 180 }),
    contactPhone: varchar("contact_phone", { length: 40 }),
    status: organizationStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex("organizations_slug_unique").on(table.slug),
    codeUnique: uniqueIndex("organizations_code_unique").on(table.code),
    shortCodeUnique: uniqueIndex("organizations_short_code_unique").on(table.shortCode),
  }),
);

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  roleName: varchar("role_name", { length: 40 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    roleId: uuid("role_id").notNull().references(() => roles.id),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 180 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    password: text("password").notNull(),
    designation: varchar("designation", { length: 120 }),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    sessionVersion: integer("session_version").notNull().default(1),
    avatarUrl: text("avatar_url"),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
    orgIdx: index("users_organization_idx").on(table.organizationId),
  }),
);

export const setPasswordTokens = pgTable("set_password_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 140 }).notNull(),
    code: varchar("code", { length: 30 }).notNull(),
    shortCode: varchar("short_code", { length: 3 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    codeUnique: uniqueIndex("projects_code_unique").on(table.code),
    shortCodeUnique: uniqueIndex("projects_short_code_unique").on(table.shortCode),
  }),
);

export const organizationProjects = pgTable(
  "organization_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    organizationProjectUnique: uniqueIndex("organization_projects_org_project_unique").on(
      table.organizationId,
      table.projectId,
    ),
    organizationIdx: index("organization_projects_organization_idx").on(table.organizationId),
    projectIdx: index("organization_projects_project_idx").on(table.projectId),
  }),
);

export const ticketSequences = pgTable(
  "ticket_sequences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    projectId: uuid("project_id").references(() => projects.id),
    projectSegment: varchar("project_segment", { length: 3 }).notNull(),
    lastNumber: integer("last_number").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    scopeUnique: uniqueIndex("ticket_sequences_scope_unique").on(
      table.organizationId,
      table.projectSegment,
    ),
  }),
);

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    name: varchar("name", { length: 140 }).notNull(),
    code: varchar("code", { length: 30 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectCodeUnique: uniqueIndex("modules_project_code_unique").on(
      table.projectId,
      table.code,
    ),
  }),
);

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketNo: varchar("ticket_no", { length: 64 }).notNull(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    reporterId: uuid("reporter_id").notNull().references(() => users.id),
    projectId: uuid("project_id").references(() => projects.id),
    moduleId: uuid("module_id").references(() => modules.id),
    type: issueTypeEnum("type"),
    priority: issuePriorityEnum("priority"),
    status: issueStatusEnum("status").notNull().default("WAITING_FOR_SUPPORT"),
    title: varchar("title", { length: 220 }).notNull(),
    description: text("description").notNull(),
    descriptionJson: jsonb("description_json"),
    reopenedCount: integer("reopened_count").notNull().default(0),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    ticketUnique: uniqueIndex("issues_ticket_no_unique").on(table.ticketNo),
    orgStatusIdx: index("issues_org_status_idx").on(table.organizationId, table.status),
    reporterIdx: index("issues_reporter_idx").on(table.reporterId),
  }),
);

export const issueAttachments = pgTable("issue_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id").notNull().references(() => issues.id),
  uploadedById: uuid("uploaded_by_id").notNull().references(() => users.id),
  url: text("url").notNull(),
  publicId: text("public_id").notNull(),
  fileName: varchar("file_name", { length: 260 }).notNull(),
  resourceType: attachmentResourceEnum("resource_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const issueComments = pgTable("issue_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id").notNull().references(() => issues.id),
  authorId: uuid("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  bodyJson: jsonb("body_json"),
  isInternal: boolean("is_internal").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const issueStatusHistory = pgTable("issue_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id").notNull().references(() => issues.id),
  actorId: uuid("actor_id").notNull().references(() => users.id),
  fromStatus: issueStatusEnum("from_status"),
  toStatus: issueStatusEnum("to_status").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const issueActivity = pgTable("issue_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id").notNull().references(() => issues.id),
  actorId: uuid("actor_id").references(() => users.id),
  type: varchar("type", { length: 60 }).notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const internalTickets = pgTable(
  "internal_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketNo: varchar("ticket_no", { length: 64 }).notNull(),
    parentIssueId: uuid("parent_issue_id").notNull().references(() => issues.id),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    projectId: uuid("project_id").references(() => projects.id),
    moduleId: uuid("module_id").references(() => modules.id),
    type: issueTypeEnum("type"),
    priority: issuePriorityEnum("priority"),
    status: internalTicketStatusEnum("status").notNull().default("NEW"),
    title: varchar("title", { length: 220 }).notNull(),
    description: text("description").notNull(),
    descriptionJson: jsonb("description_json"),
    assignedDeveloperId: uuid("assigned_developer_id").references(() => users.id),
    assignedQaId: uuid("assigned_qa_id").references(() => users.id),
    assignedAdminId: uuid("assigned_admin_id").references(() => users.id),
    previousDeveloperId: uuid("previous_developer_id").references(() => users.id),
    createdById: uuid("created_by_id").notNull().references(() => users.id),
    acceptedAt: timestamp("accepted_at"),
    devStartedAt: timestamp("dev_started_at"),
    readyForQaAt: timestamp("ready_for_qa_at"),
    qaStartedAt: timestamp("qa_started_at"),
    readyForProductionAt: timestamp("ready_for_production_at"),
    reopenedAt: timestamp("reopened_at"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    ticketUnique: uniqueIndex("internal_tickets_ticket_no_unique").on(table.ticketNo),
    parentUnique: uniqueIndex("internal_tickets_parent_issue_unique").on(table.parentIssueId),
    statusIdx: index("internal_tickets_status_idx").on(table.status),
    developerIdx: index("internal_tickets_developer_idx").on(table.assignedDeveloperId),
    qaIdx: index("internal_tickets_qa_idx").on(table.assignedQaId),
    adminIdx: index("internal_tickets_admin_idx").on(table.assignedAdminId),
  }),
);

export const internalTicketComments = pgTable("internal_ticket_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  internalTicketId: uuid("internal_ticket_id").notNull().references(() => internalTickets.id),
  authorId: uuid("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  bodyJson: jsonb("body_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const internalTicketStatusHistory = pgTable("internal_ticket_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  internalTicketId: uuid("internal_ticket_id").notNull().references(() => internalTickets.id),
  actorId: uuid("actor_id").notNull().references(() => users.id),
  fromStatus: internalTicketStatusEnum("from_status"),
  toStatus: internalTicketStatusEnum("to_status").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const internalTicketActivity = pgTable("internal_ticket_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  internalTicketId: uuid("internal_ticket_id").notNull().references(() => internalTickets.id),
  actorId: uuid("actor_id").references(() => users.id),
  type: varchar("type", { length: 60 }).notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const internalTicketWorklogs = pgTable("internal_ticket_worklogs", {
  id: uuid("id").primaryKey().defaultRandom(),
  internalTicketId: uuid("internal_ticket_id").notNull().references(() => internalTickets.id),
  developerId: uuid("developer_id").references(() => users.id),
  workerId: uuid("worker_id").references(() => users.id),
  workerRole: varchar("worker_role", { length: 30 }).notNull().default("DEVELOPER"),
  stopReason: text("stop_reason"),
  startedAt: timestamp("started_at").notNull(),
  stoppedAt: timestamp("stopped_at"),
  durationMinutes: integer("duration_minutes"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const coreTickets = pgTable(
  "core_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketNo: varchar("ticket_no", { length: 64 }).notNull(),
    type: issueTypeEnum("type"),
    priority: issuePriorityEnum("priority"),
    status: coreTicketStatusEnum("status").notNull().default("NEW"),
    title: varchar("title", { length: 220 }).notNull(),
    description: text("description").notNull(),
    descriptionJson: jsonb("description_json"),
    epicId: uuid("epic_id"),
    parentTaskId: uuid("parent_task_id"),
    projectId: uuid("project_id").references(() => projects.id),
    moduleId: uuid("module_id").references(() => modules.id),
    assignedDeveloperId: uuid("assigned_developer_id").references(() => users.id),
    assignedQaId: uuid("assigned_qa_id").references(() => users.id),
    assignedAdminId: uuid("assigned_admin_id").references(() => users.id),
    createdById: uuid("created_by_id").notNull().references(() => users.id),
    acceptedAt: timestamp("accepted_at"),
    devStartedAt: timestamp("dev_started_at"),
    readyForQaAt: timestamp("ready_for_qa_at"),
    qaStartedAt: timestamp("qa_started_at"),
    readyForProductionAt: timestamp("ready_for_production_at"),
    reopenedAt: timestamp("reopened_at"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    ticketUnique: uniqueIndex("core_tickets_ticket_no_unique").on(table.ticketNo),
    statusIdx: index("core_tickets_status_idx").on(table.status),
    epicIdx: index("core_tickets_epic_idx").on(table.epicId),
    parentTaskIdx: index("core_tickets_parent_task_idx").on(table.parentTaskId),
    developerIdx: index("core_tickets_developer_idx").on(table.assignedDeveloperId),
    qaIdx: index("core_tickets_qa_idx").on(table.assignedQaId),
    adminIdx: index("core_tickets_admin_idx").on(table.assignedAdminId),
  }),
);

export const coreTicketComments = pgTable("core_ticket_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  coreTicketId: uuid("core_ticket_id").notNull().references(() => coreTickets.id),
  authorId: uuid("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  bodyJson: jsonb("body_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const coreTicketStatusHistory = pgTable("core_ticket_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  coreTicketId: uuid("core_ticket_id").notNull().references(() => coreTickets.id),
  actorId: uuid("actor_id").notNull().references(() => users.id),
  fromStatus: coreTicketStatusEnum("from_status"),
  toStatus: coreTicketStatusEnum("to_status").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coreTicketActivity = pgTable("core_ticket_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  coreTicketId: uuid("core_ticket_id").notNull().references(() => coreTickets.id),
  actorId: uuid("actor_id").references(() => users.id),
  type: varchar("type", { length: 60 }).notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coreTicketWorklogs = pgTable("core_ticket_worklogs", {
  id: uuid("id").primaryKey().defaultRandom(),
  coreTicketId: uuid("core_ticket_id").notNull().references(() => coreTickets.id),
  workerId: uuid("worker_id").references(() => users.id),
  workerRole: varchar("worker_role", { length: 30 }).notNull().default("DEVELOPER"),
  startedAt: timestamp("started_at").notNull(),
  stoppedAt: timestamp("stopped_at"),
  durationMinutes: integer("duration_minutes"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const coreTicketLinks = pgTable("core_ticket_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceTicketId: uuid("source_ticket_id").notNull().references(() => coreTickets.id),
  targetTicketId: uuid("target_ticket_id").notNull().references(() => coreTickets.id),
  linkType: coreTicketLinkTypeEnum("link_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipientId: uuid("recipient_id").notNull().references(() => users.id),
  issueId: uuid("issue_id").references(() => issues.id),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

