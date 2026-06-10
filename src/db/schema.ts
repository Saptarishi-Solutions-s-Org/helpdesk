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
export const issueTypeEnum = pgEnum("issue_type", ["BUG", "CR"]);
export const issuePriorityEnum = pgEnum("issue_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);
export const issueStatusEnum = pgEnum("issue_status", [
  "OPEN",
  "TRIAGED",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
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

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 90 }).notNull(),
    code: varchar("code", { length: 20 }).notNull(),
    contactEmail: varchar("contact_email", { length: 180 }),
    contactPhone: varchar("contact_phone", { length: 40 }),
    status: organizationStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex("organizations_slug_unique").on(table.slug),
    codeUnique: uniqueIndex("organizations_code_unique").on(table.code),
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
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    codeUnique: uniqueIndex("projects_code_unique").on(table.code),
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
    ticketNo: varchar("ticket_no", { length: 30 }).notNull(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    reporterId: uuid("reporter_id").notNull().references(() => users.id),
    projectId: uuid("project_id").references(() => projects.id),
    moduleId: uuid("module_id").references(() => modules.id),
    type: issueTypeEnum("type"),
    priority: issuePriorityEnum("priority"),
    status: issueStatusEnum("status").notNull().default("OPEN"),
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
