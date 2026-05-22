CREATE TYPE "public"."import_job_status" AS ENUM('pending', 'processing', 'complete', 'failed');--> statement-breakpoint
CREATE TABLE "import_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid NOT NULL,
	"filnavn" text NOT NULL,
	"filtype" text NOT NULL,
	"filindhold" text NOT NULL,
	"status" "import_job_status" DEFAULT 'pending' NOT NULL,
	"resultat" jsonb,
	"fejl" text,
	"oprettet" timestamp with time zone DEFAULT now() NOT NULL,
	"opdateret" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_job" ADD CONSTRAINT "import_job_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE cascade ON UPDATE no action;