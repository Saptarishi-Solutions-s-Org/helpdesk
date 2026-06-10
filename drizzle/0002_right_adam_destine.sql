ALTER TYPE "public"."issue_type" ADD VALUE 'ISSUE';--> statement-breakpoint
ALTER TYPE "public"."issue_type" ADD VALUE 'SERVICE_REQUEST';--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "priority" SET DATA TYPE text;--> statement-breakpoint
UPDATE "issues" SET "priority" = 'CRITICAL' WHERE "priority" = 'URGENT';--> statement-breakpoint
DROP TYPE "public"."issue_priority";--> statement-breakpoint
CREATE TYPE "public"."issue_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'BLOCKER');--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "priority" SET DATA TYPE "public"."issue_priority" USING "priority"::"public"."issue_priority";--> statement-breakpoint
ALTER TABLE "issue_status_history" ALTER COLUMN "from_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_status_history" ALTER COLUMN "to_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "status" SET DEFAULT 'OPEN'::text;--> statement-breakpoint
UPDATE "issue_status_history" SET "from_status" = 'WAITING_FROM_CLIENT' WHERE "from_status" = 'WAITING_FOR_USER';--> statement-breakpoint
UPDATE "issue_status_history" SET "to_status" = 'WAITING_FROM_CLIENT' WHERE "to_status" = 'WAITING_FOR_USER';--> statement-breakpoint
UPDATE "issues" SET "status" = 'WAITING_FROM_CLIENT' WHERE "status" = 'WAITING_FOR_USER';--> statement-breakpoint
DROP TYPE "public"."issue_status";--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('OPEN', 'TRIAGED', 'IN_PROGRESS', 'WAITING_FROM_CLIENT', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED');--> statement-breakpoint
ALTER TABLE "issue_status_history" ALTER COLUMN "from_status" SET DATA TYPE "public"."issue_status" USING "from_status"::"public"."issue_status";--> statement-breakpoint
ALTER TABLE "issue_status_history" ALTER COLUMN "to_status" SET DATA TYPE "public"."issue_status" USING "to_status"::"public"."issue_status";--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "status" SET DEFAULT 'OPEN'::"public"."issue_status";--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "status" SET DATA TYPE "public"."issue_status" USING "status"::"public"."issue_status";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "session_version" integer DEFAULT 1 NOT NULL;
