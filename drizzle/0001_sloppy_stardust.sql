ALTER TABLE "issues" ALTER COLUMN "type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "priority" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "priority" DROP NOT NULL;