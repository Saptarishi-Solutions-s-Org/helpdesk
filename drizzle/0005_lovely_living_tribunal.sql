CREATE TYPE "public"."internal_ticket_status" AS ENUM('NEW', 'ACCEPTED', 'DEV_IN_PROGRESS', 'DEV_REVIEW', 'READY_FOR_QA', 'QA_IN_PROGRESS', 'READY_FOR_PRODUCTION', 'REOPENED');--> statement-breakpoint
CREATE TABLE "internal_ticket_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internal_ticket_id" uuid NOT NULL,
	"actor_id" uuid,
	"type" varchar(60) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_ticket_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internal_ticket_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"body_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_ticket_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internal_ticket_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"from_status" "internal_ticket_status",
	"to_status" "internal_ticket_status" NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_ticket_worklogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internal_ticket_id" uuid NOT NULL,
	"developer_id" uuid NOT NULL,
	"started_at" timestamp NOT NULL,
	"stopped_at" timestamp,
	"duration_minutes" integer,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_no" varchar(64) NOT NULL,
	"parent_issue_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid,
	"module_id" uuid,
	"type" "issue_type",
	"priority" "issue_priority",
	"status" "internal_ticket_status" DEFAULT 'NEW' NOT NULL,
	"title" varchar(220) NOT NULL,
	"description" text NOT NULL,
	"description_json" jsonb,
	"assigned_developer_id" uuid,
	"assigned_qa_id" uuid,
	"previous_developer_id" uuid,
	"created_by_id" uuid NOT NULL,
	"accepted_at" timestamp,
	"dev_started_at" timestamp,
	"ready_for_qa_at" timestamp,
	"qa_started_at" timestamp,
	"ready_for_production_at" timestamp,
	"reopened_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "internal_ticket_activity" ADD CONSTRAINT "internal_ticket_activity_internal_ticket_id_internal_tickets_id_fk" FOREIGN KEY ("internal_ticket_id") REFERENCES "public"."internal_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_ticket_activity" ADD CONSTRAINT "internal_ticket_activity_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_ticket_comments" ADD CONSTRAINT "internal_ticket_comments_internal_ticket_id_internal_tickets_id_fk" FOREIGN KEY ("internal_ticket_id") REFERENCES "public"."internal_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_ticket_comments" ADD CONSTRAINT "internal_ticket_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_ticket_status_history" ADD CONSTRAINT "internal_ticket_status_history_internal_ticket_id_internal_tickets_id_fk" FOREIGN KEY ("internal_ticket_id") REFERENCES "public"."internal_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_ticket_status_history" ADD CONSTRAINT "internal_ticket_status_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_ticket_worklogs" ADD CONSTRAINT "internal_ticket_worklogs_internal_ticket_id_internal_tickets_id_fk" FOREIGN KEY ("internal_ticket_id") REFERENCES "public"."internal_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_ticket_worklogs" ADD CONSTRAINT "internal_ticket_worklogs_developer_id_users_id_fk" FOREIGN KEY ("developer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_tickets" ADD CONSTRAINT "internal_tickets_parent_issue_id_issues_id_fk" FOREIGN KEY ("parent_issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_tickets" ADD CONSTRAINT "internal_tickets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_tickets" ADD CONSTRAINT "internal_tickets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_tickets" ADD CONSTRAINT "internal_tickets_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_tickets" ADD CONSTRAINT "internal_tickets_assigned_developer_id_users_id_fk" FOREIGN KEY ("assigned_developer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_tickets" ADD CONSTRAINT "internal_tickets_assigned_qa_id_users_id_fk" FOREIGN KEY ("assigned_qa_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_tickets" ADD CONSTRAINT "internal_tickets_previous_developer_id_users_id_fk" FOREIGN KEY ("previous_developer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_tickets" ADD CONSTRAINT "internal_tickets_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "internal_tickets_ticket_no_unique" ON "internal_tickets" USING btree ("ticket_no");--> statement-breakpoint
CREATE UNIQUE INDEX "internal_tickets_parent_issue_unique" ON "internal_tickets" USING btree ("parent_issue_id");--> statement-breakpoint
CREATE INDEX "internal_tickets_status_idx" ON "internal_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "internal_tickets_developer_idx" ON "internal_tickets" USING btree ("assigned_developer_id");--> statement-breakpoint
CREATE INDEX "internal_tickets_qa_idx" ON "internal_tickets" USING btree ("assigned_qa_id");