CREATE TYPE "public"."data_karakter" AS ENUM('aggregeret', 'operationel');--> statement-breakpoint
CREATE TYPE "public"."data_provenans" AS ENUM('top_down', 'bottom_up');--> statement-breakpoint
ALTER TABLE "indikator_template" ADD COLUMN "data_provenans" "data_provenans";--> statement-breakpoint
ALTER TABLE "indikator_template" ADD COLUMN "data_karakter" "data_karakter";