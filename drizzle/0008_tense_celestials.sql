CREATE TABLE "core_ticket_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"core_ticket_id" uuid NOT NULL,
	"uploaded_by_id" uuid NOT NULL,
	"url" text NOT NULL,
	"public_id" text NOT NULL,
	"file_name" varchar(260) NOT NULL,
	"resource_type" "attachment_resource" NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core_ticket_attachments" ADD CONSTRAINT "core_ticket_attachments_core_ticket_id_core_tickets_id_fk" FOREIGN KEY ("core_ticket_id") REFERENCES "public"."core_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core_ticket_attachments" ADD CONSTRAINT "core_ticket_attachments_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;