CREATE TYPE "public"."core_ticket_link_type" AS ENUM('RELATES_TO', 'BLOCKS', 'IS_BLOCKED_BY', 'DUPLICATES', 'IS_DUPLICATED_BY');--> statement-breakpoint
CREATE TYPE "public"."core_ticket_status" AS ENUM('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED', 'NEW', 'ACCEPTED', 'DEV_IN_PROGRESS', 'DEV_REVIEW', 'READY_FOR_QA', 'QA_IN_PROGRESS', 'READY_FOR_PRODUCTION', 'REOPENED');--> statement-breakpoint
ALTER TYPE "public"."issue_type" ADD VALUE 'EPIC';--> statement-breakpoint
ALTER TYPE "public"."issue_type" ADD VALUE 'TASK';--> statement-breakpoint
ALTER TYPE "public"."issue_type" ADD VALUE 'SUBTASK';--> statement-breakpoint
ALTER TYPE "public"."issue_type" ADD VALUE 'IMPROVEMENT';--> statement-breakpoint
ALTER TYPE "public"."issue_type" ADD VALUE 'FEATURE';--> statement-breakpoint
ALTER TYPE "public"."issue_type" ADD VALUE 'DOCUMENTATION';--> statement-breakpoint
CREATE TABLE "core_ticket_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"core_ticket_id" uuid NOT NULL,
	"actor_id" uuid,
	"type" varchar(60) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_ticket_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"core_ticket_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"body_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_ticket_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_ticket_id" uuid NOT NULL,
	"target_ticket_id" uuid NOT NULL,
	"link_type" "core_ticket_link_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_ticket_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"core_ticket_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"from_status" "core_ticket_status",
	"to_status" "core_ticket_status" NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_ticket_worklogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"core_ticket_id" uuid NOT NULL,
	"worker_id" uuid,
	"worker_role" varchar(30) DEFAULT 'DEVELOPER' NOT NULL,
	"started_at" timestamp NOT NULL,
	"stopped_at" timestamp,
	"duration_minutes" integer,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_no" varchar(64) NOT NULL,
	"type" "issue_type",
	"priority" "issue_priority",
	"status" "core_ticket_status" DEFAULT 'NEW' NOT NULL,
	"title" varchar(220) NOT NULL,
	"description" text NOT NULL,
	"description_json" jsonb,
	"epic_id" uuid,
	"parent_task_id" uuid,
	"project_id" uuid,
	"module_id" uuid,
	"assigned_developer_id" uuid,
	"assigned_qa_id" uuid,
	"assigned_admin_id" uuid,
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
ALTER TABLE "core_ticket_activity" ADD CONSTRAINT "core_ticket_activity_core_ticket_id_core_tickets_id_fk" FOREIGN KEY ("core_ticket_id") REFERENCES "public"."core_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_ticket_activity" ADD CONSTRAINT "core_ticket_activity_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_ticket_comments" ADD CONSTRAINT "core_ticket_comments_core_ticket_id_core_tickets_id_fk" FOREIGN KEY ("core_ticket_id") REFERENCES "public"."core_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_ticket_comments" ADD CONSTRAINT "core_ticket_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_ticket_links" ADD CONSTRAINT "core_ticket_links_source_ticket_id_core_tickets_id_fk" FOREIGN KEY ("source_ticket_id") REFERENCES "public"."core_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_ticket_links" ADD CONSTRAINT "core_ticket_links_target_ticket_id_core_tickets_id_fk" FOREIGN KEY ("target_ticket_id") REFERENCES "public"."core_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_ticket_status_history" ADD CONSTRAINT "core_ticket_status_history_core_ticket_id_core_tickets_id_fk" FOREIGN KEY ("core_ticket_id") REFERENCES "public"."core_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_ticket_status_history" ADD CONSTRAINT "core_ticket_status_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_ticket_worklogs" ADD CONSTRAINT "core_ticket_worklogs_core_ticket_id_core_tickets_id_fk" FOREIGN KEY ("core_ticket_id") REFERENCES "public"."core_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_ticket_worklogs" ADD CONSTRAINT "core_ticket_worklogs_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_tickets" ADD CONSTRAINT "core_tickets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_tickets" ADD CONSTRAINT "core_tickets_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_tickets" ADD CONSTRAINT "core_tickets_assigned_developer_id_users_id_fk" FOREIGN KEY ("assigned_developer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_tickets" ADD CONSTRAINT "core_tickets_assigned_qa_id_users_id_fk" FOREIGN KEY ("assigned_qa_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_tickets" ADD CONSTRAINT "core_tickets_assigned_admin_id_users_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_tickets" ADD CONSTRAINT "core_tickets_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "core_tickets_ticket_no_unique" ON "core_tickets" USING btree ("ticket_no");--> statement-breakpoint
CREATE INDEX "core_tickets_status_idx" ON "core_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "core_tickets_epic_idx" ON "core_tickets" USING btree ("epic_id");--> statement-breakpoint
CREATE INDEX "core_tickets_parent_task_idx" ON "core_tickets" USING btree ("parent_task_id");--> statement-breakpoint
CREATE INDEX "core_tickets_developer_idx" ON "core_tickets" USING btree ("assigned_developer_id");--> statement-breakpoint
CREATE INDEX "core_tickets_qa_idx" ON "core_tickets" USING btree ("assigned_qa_id");--> statement-breakpoint
CREATE INDEX "core_tickets_admin_idx" ON "core_tickets" USING btree ("assigned_admin_id");