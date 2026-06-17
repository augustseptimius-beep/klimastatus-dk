CREATE TYPE "public"."kommunetype" AS ENUM('land', 'oplands', 'provinsby', 'storby', 'hovedstad');--> statement-breakpoint
ALTER TABLE "kommune" ADD COLUMN "kommunetype" "kommunetype";