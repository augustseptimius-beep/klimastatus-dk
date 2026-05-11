CREATE TYPE "public"."aktoer_type" AS ENUM('internal', 'external', 'citizen', 'business', 'utility', 'civil_society', 'political');--> statement-breakpoint
CREATE TYPE "public"."api_kilde" AS ENUM('klimaregnskab', 'energidataservice', 'bbr', 'dst', 'klimaatlas', 'kamp', 'hip');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete');--> statement-breakpoint
CREATE TYPE "public"."avoid_shift_improve" AS ENUM('avoid', 'shift', 'improve');--> statement-breakpoint
CREATE TYPE "public"."befojelses_kategori" AS ENUM('enterprise', 'supplier', 'authority', 'facilitator');--> statement-breakpoint
CREATE TYPE "public"."datakilde_type" AS ENUM('manual', 'api');--> statement-breakpoint
CREATE TYPE "public"."dokumentationsstyrke" AS ENUM('primary', 'secondary');--> statement-breakpoint
CREATE TYPE "public"."gruppe_tag" AS ENUM('affected_by_climate_change', 'affected_by_climate_action', 'has_power_influence');--> statement-breakpoint
CREATE TYPE "public"."indikator_niveau" AS ENUM('output', 'outcome', 'impact');--> statement-breakpoint
CREATE TYPE "public"."indsats_type" AS ENUM('ghg_reduction', 'adaptation', 'consumption', 'just_transition', 'cross_cutting');--> statement-breakpoint
CREATE TYPE "public"."klimafare_type" AS ENUM('flooding', 'drought', 'heat', 'storm', 'sea_level_rise', 'groundwater', 'other');--> statement-breakpoint
CREATE TYPE "public"."kriterie_status" AS ENUM('complete', 'partial', 'missing');--> statement-breakpoint
CREATE TYPE "public"."maal_kategori" AS ENUM('reduction', 'adaptation', 'co_benefits', 'consumption');--> statement-breakpoint
CREATE TYPE "public"."maal_type" AS ENUM('smart', 'qualitative');--> statement-breakpoint
CREATE TYPE "public"."saarbar_gruppe_kategori" AS ENUM('low_income', 'elderly', 'children', 'disability', 'ethnicity', 'geography', 'other');--> statement-breakpoint
CREATE TYPE "public"."scenarie_type" AS ENUM('bau', 'action');--> statement-breakpoint
CREATE TYPE "public"."sektor" AS ENUM('energy', 'transport', 'buildings', 'food', 'agriculture', 'waste', 'adaptation', 'other');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."tidsramme" AS ENUM('short', 'medium', 'long');--> statement-breakpoint
CREATE TYPE "public"."tiltag_status" AS ENUM('planned', 'in_progress', 'completed', 'discontinued');--> statement-breakpoint
CREATE TYPE "public"."tiltag_type" AS ENUM('reduction', 'adaptation', 'both');--> statement-breakpoint
CREATE TABLE "kommune" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommunekode" text NOT NULL,
	"navn" text NOT NULL,
	"befolkningstal" integer,
	"areal_km2" real,
	"klimakommitment_dato" date,
	"klimakommitment_tekst" text,
	"recertificeringsdato" date,
	"logo_url" text,
	"primary_color" text,
	"secondary_color" text,
	"font_family" text,
	"subdomain" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kommune_kommunekode_unique" UNIQUE("kommunekode"),
	CONSTRAINT "kommune_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "magic_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"tovholder_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "magic_link_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid,
	"email" text NOT NULL,
	"password_hash" text,
	"navn" text NOT NULL,
	"role" text DEFAULT 'koordinator' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "indsats_omraade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid NOT NULL,
	"navn" text NOT NULL,
	"type" "indsats_type" NOT NULL,
	"sektor" "sektor" NOT NULL,
	"forbrugskategori_tag" text,
	"ansvarlig_forvaltning" text,
	"beskrivelse" text,
	"aktiv" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indsats_omraade_id" uuid NOT NULL,
	"type" "maal_type" NOT NULL,
	"tidsramme" "tidsramme" NOT NULL,
	"maal_aar" integer,
	"maal_vaerdi" real,
	"enhed" text,
	"baseline_vaerdi" real,
	"baseline_aar" integer,
	"beskrivelse" text NOT NULL,
	"kategori" "maal_kategori" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tiltag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid NOT NULL,
	"indsats_omraade_id" uuid NOT NULL,
	"titel" text NOT NULL,
	"beskrivelse" text,
	"type" "tiltag_type" NOT NULL,
	"tidsramme_start" date,
	"tidsramme_slut" date,
	"ansvarlig_organisation" text,
	"forventet_effekt_co2_ton" real,
	"forventet_effekt_kvalitativ" text,
	"status" "tiltag_status" DEFAULT 'planned' NOT NULL,
	"prioriteret_tiltag" boolean DEFAULT false NOT NULL,
	"befojelses_kategori" "befojelses_kategori",
	"avoid_shift_improve" "avoid_shift_improve",
	"forbrug_kategori" text,
	"retfaerdig_fordeling_relevant" boolean DEFAULT false NOT NULL,
	"udfaser_fossile_braendsler" boolean DEFAULT false NOT NULL,
	"understoettende_tiltag" text,
	"implementeringsplan" text,
	"milepael" jsonb,
	"omkostninger_detaljeret" text,
	"finansieringstilgang" text,
	"fordeling_gevinster_byrder" text,
	"kommunikationsplan" text,
	"barrierer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tovholder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid NOT NULL,
	"navn" text NOT NULL,
	"forvaltning" text,
	"email" text NOT NULL,
	"aktiv" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tovholder_rapport" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tovholder_id" uuid NOT NULL,
	"tiltag_id" uuid NOT NULL,
	"dato" date NOT NULL,
	"status_implementering" text,
	"status_beskrivelse" text,
	"barrierer" text,
	"naeste_skridt" text,
	"effekt_realiseret" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tovholder_tiltag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tovholder_id" uuid NOT NULL,
	"tiltag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indikator" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niveau" "indikator_niveau" NOT NULL,
	"beskrivelse" text NOT NULL,
	"enhed" text,
	"datakilde_type" "datakilde_type" NOT NULL,
	"api_kilde" "api_kilde",
	"api_query" text,
	"aggregeringsformel" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indikator_indsats_omraade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indikator_id" uuid NOT NULL,
	"indsats_omraade_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indikator_maal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indikator_id" uuid NOT NULL,
	"maal_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indikator_maaling" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indikator_id" uuid NOT NULL,
	"dato" date,
	"aar" integer,
	"vaerdi" real NOT NULL,
	"kilde" text,
	"bemaerkning" text,
	"auto_hentet" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indikator_tiltag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indikator_id" uuid NOT NULL,
	"tiltag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aktoer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid NOT NULL,
	"navn" text NOT NULL,
	"type" "aktoer_type" NOT NULL,
	"inddragelsesform" text,
	"inddragelsesfrekvens" text,
	"paavirkning_paa_plan_tekst" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aktoer_gruppe_tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aktoer_id" uuid NOT NULL,
	"gruppe_tag" "gruppe_tag" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "klimafare" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid NOT NULL,
	"type" "klimafare_type" NOT NULL,
	"sandsynlighed" text,
	"hyppighed" text,
	"intensitet" text,
	"tidsskala" text,
	"rumlig_fordeling_geometri" jsonb,
	"datakilde" text,
	"data_dato" text,
	"data_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "konsekvensvurdering" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"klimafare_id" uuid NOT NULL,
	"beroert_kategori" text NOT NULL,
	"beroert_id" uuid,
	"konsekvens_beskrivelse" text,
	"alvor" "severity",
	"tilpasningskapacitet" "severity",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saarbar_gruppe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid NOT NULL,
	"gruppe_kategori" "saarbar_gruppe_kategori" NOT NULL,
	"beskrivelse" text,
	"vidensgrundlag_kilde" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saarbar_gruppe_indsats_omraade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saarbar_gruppe_id" uuid NOT NULL,
	"indsats_omraade_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saarbar_gruppe_klimafare" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saarbar_gruppe_id" uuid NOT NULL,
	"klimafare_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "befojelses_vurdering" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid NOT NULL,
	"indsats_omraade_id" uuid NOT NULL,
	"rolle" "befojelses_kategori" NOT NULL,
	"aktive_tiltag_count" integer,
	"udnyttelsesvurdering_tekst" text,
	"mangler_tekst" text,
	"dato" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivhusgasregnskab_post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid NOT NULL,
	"aar" integer NOT NULL,
	"gpc_sektor" text NOT NULL,
	"udledning_ton_co2e" real NOT NULL,
	"datakilde" text,
	"gpc_kompatibel" boolean DEFAULT true NOT NULL,
	"metodeversion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenarie_post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid NOT NULL,
	"scenarie_type" "scenarie_type" NOT NULL,
	"aar" integer NOT NULL,
	"sektor" text,
	"udledning_ton_co2e" real NOT NULL,
	"metode_beskrivelse" text,
	"tiltag_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cctf_kriterie" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" text NOT NULL,
	"kriterie_nr" integer NOT NULL,
	"komponent" text NOT NULL,
	"titel" text NOT NULL,
	"beskrivelse" text NOT NULL,
	"krav" jsonb,
	"aktiv" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cctf_kriterie_mapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entitet_type" text NOT NULL,
	"entitet_id" uuid NOT NULL,
	"kriterie_nr" integer NOT NULL,
	"dokumentationsstyrke" "dokumentationsstyrke" DEFAULT 'primary' NOT NULL,
	"bemaerkning" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selvevaluering" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid NOT NULL,
	"cctf_version" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"genereret_dato" timestamp with time zone DEFAULT now() NOT NULL,
	"godkendt_af" uuid,
	"godkendelsesdato" timestamp with time zone,
	"kriterie_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"entitet_type" text NOT NULL,
	"entitet_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"ip_address" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indsats_omraade" ADD CONSTRAINT "indsats_omraade_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maal" ADD CONSTRAINT "maal_indsats_omraade_id_indsats_omraade_id_fk" FOREIGN KEY ("indsats_omraade_id") REFERENCES "public"."indsats_omraade"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiltag" ADD CONSTRAINT "tiltag_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiltag" ADD CONSTRAINT "tiltag_indsats_omraade_id_indsats_omraade_id_fk" FOREIGN KEY ("indsats_omraade_id") REFERENCES "public"."indsats_omraade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tovholder" ADD CONSTRAINT "tovholder_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tovholder_rapport" ADD CONSTRAINT "tovholder_rapport_tovholder_id_tovholder_id_fk" FOREIGN KEY ("tovholder_id") REFERENCES "public"."tovholder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tovholder_rapport" ADD CONSTRAINT "tovholder_rapport_tiltag_id_tiltag_id_fk" FOREIGN KEY ("tiltag_id") REFERENCES "public"."tiltag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tovholder_tiltag" ADD CONSTRAINT "tovholder_tiltag_tovholder_id_tovholder_id_fk" FOREIGN KEY ("tovholder_id") REFERENCES "public"."tovholder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tovholder_tiltag" ADD CONSTRAINT "tovholder_tiltag_tiltag_id_tiltag_id_fk" FOREIGN KEY ("tiltag_id") REFERENCES "public"."tiltag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indikator_indsats_omraade" ADD CONSTRAINT "indikator_indsats_omraade_indikator_id_indikator_id_fk" FOREIGN KEY ("indikator_id") REFERENCES "public"."indikator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indikator_indsats_omraade" ADD CONSTRAINT "indikator_indsats_omraade_indsats_omraade_id_indsats_omraade_id_fk" FOREIGN KEY ("indsats_omraade_id") REFERENCES "public"."indsats_omraade"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indikator_maal" ADD CONSTRAINT "indikator_maal_indikator_id_indikator_id_fk" FOREIGN KEY ("indikator_id") REFERENCES "public"."indikator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indikator_maal" ADD CONSTRAINT "indikator_maal_maal_id_maal_id_fk" FOREIGN KEY ("maal_id") REFERENCES "public"."maal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indikator_maaling" ADD CONSTRAINT "indikator_maaling_indikator_id_indikator_id_fk" FOREIGN KEY ("indikator_id") REFERENCES "public"."indikator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indikator_tiltag" ADD CONSTRAINT "indikator_tiltag_indikator_id_indikator_id_fk" FOREIGN KEY ("indikator_id") REFERENCES "public"."indikator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indikator_tiltag" ADD CONSTRAINT "indikator_tiltag_tiltag_id_tiltag_id_fk" FOREIGN KEY ("tiltag_id") REFERENCES "public"."tiltag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aktoer" ADD CONSTRAINT "aktoer_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aktoer_gruppe_tag" ADD CONSTRAINT "aktoer_gruppe_tag_aktoer_id_aktoer_id_fk" FOREIGN KEY ("aktoer_id") REFERENCES "public"."aktoer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "klimafare" ADD CONSTRAINT "klimafare_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "konsekvensvurdering" ADD CONSTRAINT "konsekvensvurdering_klimafare_id_klimafare_id_fk" FOREIGN KEY ("klimafare_id") REFERENCES "public"."klimafare"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saarbar_gruppe" ADD CONSTRAINT "saarbar_gruppe_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saarbar_gruppe_indsats_omraade" ADD CONSTRAINT "saarbar_gruppe_indsats_omraade_saarbar_gruppe_id_saarbar_gruppe_id_fk" FOREIGN KEY ("saarbar_gruppe_id") REFERENCES "public"."saarbar_gruppe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saarbar_gruppe_indsats_omraade" ADD CONSTRAINT "saarbar_gruppe_indsats_omraade_indsats_omraade_id_indsats_omraade_id_fk" FOREIGN KEY ("indsats_omraade_id") REFERENCES "public"."indsats_omraade"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saarbar_gruppe_klimafare" ADD CONSTRAINT "saarbar_gruppe_klimafare_saarbar_gruppe_id_saarbar_gruppe_id_fk" FOREIGN KEY ("saarbar_gruppe_id") REFERENCES "public"."saarbar_gruppe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saarbar_gruppe_klimafare" ADD CONSTRAINT "saarbar_gruppe_klimafare_klimafare_id_klimafare_id_fk" FOREIGN KEY ("klimafare_id") REFERENCES "public"."klimafare"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "befojelses_vurdering" ADD CONSTRAINT "befojelses_vurdering_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "befojelses_vurdering" ADD CONSTRAINT "befojelses_vurdering_indsats_omraade_id_indsats_omraade_id_fk" FOREIGN KEY ("indsats_omraade_id") REFERENCES "public"."indsats_omraade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivhusgasregnskab_post" ADD CONSTRAINT "drivhusgasregnskab_post_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarie_post" ADD CONSTRAINT "scenarie_post_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarie_post" ADD CONSTRAINT "scenarie_post_tiltag_id_tiltag_id_fk" FOREIGN KEY ("tiltag_id") REFERENCES "public"."tiltag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selvevaluering" ADD CONSTRAINT "selvevaluering_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE cascade ON UPDATE no action;