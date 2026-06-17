CREATE TYPE "public"."standardtiltag_kategori" AS ENUM('energi', 'transport', 'landbrug_areal', 'scope3');--> statement-breakpoint
CREATE TABLE "standardtiltag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titel" text NOT NULL,
	"kategori" "standardtiltag_kategori" NOT NULL,
	"sektor" "sektor",
	"udbredelses_procent" integer,
	"type" "tiltag_type" DEFAULT 'reduction' NOT NULL,
	"beskrivelse" text,
	"aktiv" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "standardtiltag_titel_unique" ON "standardtiltag" USING btree ("titel");