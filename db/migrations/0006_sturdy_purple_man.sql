ALTER TABLE "kommune" ADD COLUMN "public_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "kommune" ADD COLUMN "public_stale_days" integer;--> statement-breakpoint
ALTER TABLE "kommune" ADD COLUMN "public_highlights" text[];