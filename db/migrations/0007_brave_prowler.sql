-- Enums
CREATE TYPE "public"."monitorerings_type" AS ENUM('aarlig', 'kvartal', 'ad_hoc');--> statement-breakpoint
CREATE TYPE "public"."monitorerings_status" AS ENUM('aaben', 'lukket', 'rapporteret');--> statement-breakpoint

-- Tabel
CREATE TABLE "monitoreringscyklus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kommune_id" uuid NOT NULL,
	"navn" text NOT NULL,
	"periode_start" date,
	"periode_slut" date,
	"type" "monitorerings_type" NOT NULL,
	"aar" integer,
	"status" "monitorerings_status" DEFAULT 'aaben' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monitoreringscyklus_kommune_type_aar_unique" UNIQUE("kommune_id","type","aar")
);--> statement-breakpoint
ALTER TABLE "monitoreringscyklus" ADD CONSTRAINT "monitoreringscyklus_kommune_id_kommune_id_fk" FOREIGN KEY ("kommune_id") REFERENCES "public"."kommune"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- 1) Tilføj kolonnen som NULLABLE først
ALTER TABLE "indikator_maaling" ADD COLUMN "monitoreringscyklus_id" uuid;--> statement-breakpoint

-- 2) Backfill: opret én årlig cyklus pr. (kommune, aar) og kobl målingerne.
WITH maaling_kommune AS (
	SELECT m.id AS maaling_id, m.aar AS aar,
		COALESCE(
			(SELECT ki.kommune_id FROM kommune_indikator ki
				WHERE ki.indikator_id = m.indikator_id LIMIT 1),
			(SELECT io.kommune_id FROM indikator_indsats_omraade iio
				JOIN indsats_omraade io ON io.id = iio.indsats_omraade_id
				WHERE iio.indikator_id = m.indikator_id LIMIT 1),
			(SELECT io.kommune_id FROM indikator_maal im
				JOIN maal ma ON ma.id = im.maal_id
				JOIN indsats_omraade io ON io.id = ma.indsats_omraade_id
				WHERE im.indikator_id = m.indikator_id LIMIT 1)
		) AS kommune_id
	FROM indikator_maaling m
),
distinct_cyklus AS (
	SELECT DISTINCT kommune_id, aar
	FROM maaling_kommune
	WHERE kommune_id IS NOT NULL AND aar IS NOT NULL
),
inserted AS (
	INSERT INTO monitoreringscyklus (kommune_id, navn, type, aar, status)
	SELECT kommune_id, 'Årsstatus ' || aar, 'aarlig', aar, 'rapporteret'
	FROM distinct_cyklus
	RETURNING id, kommune_id, aar
)
UPDATE indikator_maaling m
SET monitoreringscyklus_id = c.id
FROM maaling_kommune mk
JOIN inserted c ON c.kommune_id = mk.kommune_id AND c.aar = mk.aar
WHERE m.id = mk.maaling_id;--> statement-breakpoint

-- 3) Vagt: fejl højlydt hvis nogen måling ikke kunne kobles
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM indikator_maaling WHERE monitoreringscyklus_id IS NULL) THEN
		RAISE EXCEPTION 'Backfill ufuldstændig: % maaling(er) uden monitoreringscyklus_id (kommune/aar kunne ikke udledes)',
			(SELECT count(*) FROM indikator_maaling WHERE monitoreringscyklus_id IS NULL);
	END IF;
END $$;--> statement-breakpoint

-- 4) Sæt NOT NULL + FK
ALTER TABLE "indikator_maaling" ALTER COLUMN "monitoreringscyklus_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "indikator_maaling" ADD CONSTRAINT "indikator_maaling_monitoreringscyklus_id_monitoreringscyklus_id_fk" FOREIGN KEY ("monitoreringscyklus_id") REFERENCES "public"."monitoreringscyklus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- 5) Byt unique-constraint
ALTER TABLE "indikator_maaling" DROP CONSTRAINT "indikator_maaling_indikator_aar_unique";--> statement-breakpoint
ALTER TABLE "indikator_maaling" ADD CONSTRAINT "indikator_maaling_indikator_cyklus_unique" UNIQUE("indikator_id","monitoreringscyklus_id");
