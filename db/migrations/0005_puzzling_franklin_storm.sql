CREATE TYPE "public"."laerings_beslutning" AS ENUM('viderefoeres', 'justeres', 'udgaar', 'tilfoeres_ressourcer', 'eskaleres');--> statement-breakpoint
CREATE TYPE "public"."laerings_knytning" AS ENUM('tiltag', 'indsatsomraade', 'maal');--> statement-breakpoint
CREATE TABLE "laeringspost" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid NOT NULL,
	"knyttet_til_type" "laerings_knytning" NOT NULL,
	"knyttet_til_id" uuid NOT NULL,
	"observation" text NOT NULL,
	"fortolkning" text,
	"beslutning" "laerings_beslutning" NOT NULL,
	"beslutningstager" text,
	"dato" date NOT NULL,
	"tovholder_rapport_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "laeringspost" ADD CONSTRAINT "laeringspost_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laeringspost" ADD CONSTRAINT "laeringspost_tovholder_rapport_id_tovholder_rapport_id_fk" FOREIGN KEY ("tovholder_rapport_id") REFERENCES "public"."tovholder_rapport"("id") ON DELETE set null ON UPDATE no action;