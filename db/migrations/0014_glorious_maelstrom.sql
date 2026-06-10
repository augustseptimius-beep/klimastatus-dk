CREATE TYPE "public"."forespoergsel_status" AS ENUM('sendt', 'besvaret', 'forfalden');--> statement-breakpoint
CREATE TYPE "public"."indhentnings_kadence" AS ENUM('maanedlig', 'kvartalsvis', 'halvaarlig', 'aarlig', 'manuel');--> statement-breakpoint
CREATE TABLE "forespoergsel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid NOT NULL,
	"tovholder_id" uuid NOT NULL,
	"tiltag_id" uuid NOT NULL,
	"monitoreringscyklus_id" uuid,
	"spoergsmaal" text,
	"status" "forespoergsel_status" DEFAULT 'sendt' NOT NULL,
	"sendt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"besvaret_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kommune" ADD COLUMN "indhentnings_kadence" "indhentnings_kadence" DEFAULT 'aarlig' NOT NULL;--> statement-breakpoint
ALTER TABLE "tovholder_rapport" ADD COLUMN "forespoergsel_id" uuid;--> statement-breakpoint
ALTER TABLE "forespoergsel" ADD CONSTRAINT "forespoergsel_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forespoergsel" ADD CONSTRAINT "forespoergsel_tovholder_id_tovholder_id_fk" FOREIGN KEY ("tovholder_id") REFERENCES "public"."tovholder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forespoergsel" ADD CONSTRAINT "forespoergsel_tiltag_id_tiltag_id_fk" FOREIGN KEY ("tiltag_id") REFERENCES "public"."tiltag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forespoergsel" ADD CONSTRAINT "forespoergsel_monitoreringscyklus_id_monitoreringscyklus_id_fk" FOREIGN KEY ("monitoreringscyklus_id") REFERENCES "public"."monitoreringscyklus"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tovholder_rapport" ADD CONSTRAINT "tovholder_rapport_forespoergsel_id_forespoergsel_id_fk" FOREIGN KEY ("forespoergsel_id") REFERENCES "public"."forespoergsel"("id") ON DELETE set null ON UPDATE no action;
