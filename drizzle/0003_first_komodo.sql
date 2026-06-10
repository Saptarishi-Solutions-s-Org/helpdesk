CREATE TABLE "organization_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid,
	"project_segment" varchar(3) NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "ticket_no" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "short_code" varchar(3);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "short_code" varchar(3);--> statement-breakpoint
WITH numbered AS (
	SELECT id, row_number() OVER (ORDER BY code) - 1 AS n
	FROM "organizations"
), generated AS (
	SELECT
		id,
		CASE
			WHEN n < 1296 THEN
				substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', (n / 36)::int + 1, 1) ||
				substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', (n % 36)::int + 1, 1)
			ELSE
				substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', (n / 1296)::int + 1, 1) ||
				substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', ((n / 36) % 36)::int + 1, 1) ||
				substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', (n % 36)::int + 1, 1)
		END AS short_code
	FROM numbered
)
UPDATE "organizations"
SET "short_code" = generated.short_code
FROM generated
WHERE "organizations"."id" = generated.id;--> statement-breakpoint
WITH numbered AS (
	SELECT id, row_number() OVER (ORDER BY code) - 1 AS n
	FROM "projects"
), generated AS (
	SELECT
		id,
		CASE
			WHEN n < 1296 THEN
				substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', (n / 36)::int + 1, 1) ||
				substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', (n % 36)::int + 1, 1)
			ELSE
				substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', (n / 1296)::int + 1, 1) ||
				substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', ((n / 36) % 36)::int + 1, 1) ||
				substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', (n % 36)::int + 1, 1)
		END AS short_code
	FROM numbered
)
UPDATE "projects"
SET "short_code" = generated.short_code
FROM generated
WHERE "projects"."id" = generated.id;--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "short_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "short_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_projects" ADD CONSTRAINT "organization_projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_projects" ADD CONSTRAINT "organization_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_sequences" ADD CONSTRAINT "ticket_sequences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_sequences" ADD CONSTRAINT "ticket_sequences_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_projects_org_project_unique" ON "organization_projects" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "organization_projects_organization_idx" ON "organization_projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_projects_project_idx" ON "organization_projects" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_sequences_scope_unique" ON "ticket_sequences" USING btree ("organization_id","project_segment");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_short_code_unique" ON "organizations" USING btree ("short_code");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_short_code_unique" ON "projects" USING btree ("short_code");
