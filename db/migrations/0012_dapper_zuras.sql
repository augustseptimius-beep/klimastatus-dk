CREATE TABLE "tiltag_effekt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tiltag_id" uuid NOT NULL,
	"kategori" text,
	"vaerdi" real,
	"enhed" text,
	"beskrivelse" text,
	"sortering" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tiltag_effekt" ADD CONSTRAINT "tiltag_effekt_tiltag_id_tiltag_id_fk" FOREIGN KEY ("tiltag_id") REFERENCES "public"."tiltag"("id") ON DELETE cascade ON UPDATE no action;