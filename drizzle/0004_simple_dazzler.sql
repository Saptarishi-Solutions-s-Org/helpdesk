ALTER TYPE "public"."issue_status" ADD VALUE 'WAITING_FOR_SUPPORT' BEFORE 'IN_PROGRESS';--> statement-breakpoint
ALTER TYPE "public"."issue_status" ADD VALUE 'BACKLOG' BEFORE 'IN_PROGRESS';--> statement-breakpoint
ALTER TYPE "public"."issue_status" ADD VALUE 'IN_ANALYSIS' BEFORE 'IN_PROGRESS';--> statement-breakpoint
ALTER TYPE "public"."issue_status" ADD VALUE 'QUEUED_FOR_RELEASE' BEFORE 'RESOLVED';--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "status" SET DEFAULT 'WAITING_FOR_SUPPORT'::text::"public"."issue_status";