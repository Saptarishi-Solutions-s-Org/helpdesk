ALTER TABLE "internal_ticket_worklogs" ALTER COLUMN "developer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "internal_ticket_worklogs" ADD COLUMN "worker_id" uuid;--> statement-breakpoint
ALTER TABLE "internal_ticket_worklogs" ADD COLUMN "worker_role" varchar(30) DEFAULT 'DEVELOPER' NOT NULL;--> statement-breakpoint
ALTER TABLE "internal_ticket_worklogs" ADD COLUMN "stop_reason" text;--> statement-breakpoint
ALTER TABLE "internal_tickets" ADD COLUMN "assigned_admin_id" uuid;--> statement-breakpoint
ALTER TABLE "internal_ticket_worklogs" ADD CONSTRAINT "internal_ticket_worklogs_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_tickets" ADD CONSTRAINT "internal_tickets_assigned_admin_id_users_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "internal_tickets_admin_idx" ON "internal_tickets" USING btree ("assigned_admin_id");