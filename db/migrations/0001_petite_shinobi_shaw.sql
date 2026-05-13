CREATE TABLE "indikator_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titel" text NOT NULL,
	"kilde" "api_kilde" NOT NULL,
	"api_query" text NOT NULL,
	"enhed" text NOT NULL,
	"beskrivelse" text NOT NULL,
	"cctf_kriterier" integer[] DEFAULT '{}' NOT NULL,
	"aktiv" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kommune_indikator" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"indikator_id" uuid NOT NULL,
	"visningsnavn" text,
	"aktiv" boolean DEFAULT true NOT NULL,
	"sidst_hentet" timestamp with time zone,
	"sidste_fejl" timestamp with time zone,
	"sidste_fejl_besked" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kommune_indikator" ADD CONSTRAINT "kommune_indikator_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kommune_indikator" ADD CONSTRAINT "kommune_indikator_template_id_indikator_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."indikator_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kommune_indikator" ADD CONSTRAINT "kommune_indikator_indikator_id_indikator_id_fk" FOREIGN KEY ("indikator_id") REFERENCES "public"."indikator"("id") ON DELETE restrict ON UPDATE no action;