ALTER TABLE "indikator_template" ALTER COLUMN "kilde" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "indikator_template" ALTER COLUMN "api_query" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "indikator_template" ADD COLUMN "niveau" "indikator_niveau";--> statement-breakpoint
ALTER TABLE "indikator_template" ADD COLUMN "sektor" "sektor";--> statement-breakpoint
ALTER TABLE "indikator_template" ADD COLUMN "national_maalvaerdi" real;--> statement-breakpoint
ALTER TABLE "indikator_template" ADD COLUMN "national_maalvaerdi_note" text;