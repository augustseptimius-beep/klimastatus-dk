-- Omdøb eksisterende dubletter ikke-destruktivt ("Navn (2)", "Navn (3)" …)
-- så den unikke constraint kan tilføjes på databaser ramt af dublet-import.
WITH dubletter AS (
	SELECT id, navn,
		ROW_NUMBER() OVER (PARTITION BY kommune_id, navn ORDER BY created_at, id) AS rn
	FROM "indsats_omraade"
)
UPDATE "indsats_omraade" io
SET navn = d.navn || ' (' || d.rn || ')'
FROM dubletter d
WHERE io.id = d.id AND d.rn > 1;--> statement-breakpoint
ALTER TABLE "indsats_omraade" ADD CONSTRAINT "indsats_omraade_kommune_navn_unique" UNIQUE("kommune_id","navn");
