-- Ryd duplikater oprettet af seed der kørte uden unique constraint.
-- For hvert duplikat-sæt beholdes den ældste række; kommune_indikator-referencer
-- reroutes til den overlevende, og de ekstra rækker slettes derefter.

WITH ranked AS (
  SELECT id, titel,
         ROW_NUMBER() OVER (PARTITION BY titel ORDER BY created_at) AS rn
  FROM indikator_template
),
keepers AS (
  SELECT titel, id AS keep_id FROM ranked WHERE rn = 1
),
dupes AS (
  SELECT r.id AS dupe_id, k.keep_id
  FROM ranked r
  JOIN keepers k ON r.titel = k.titel
  WHERE r.rn > 1
)
UPDATE kommune_indikator ki
SET template_id = d.keep_id
FROM dupes d
WHERE ki.template_id = d.dupe_id;

DELETE FROM indikator_template
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY titel ORDER BY created_at) AS rn
    FROM indikator_template
  ) sub WHERE rn > 1
);

CREATE UNIQUE INDEX "indikator_template_titel_unique" ON "indikator_template" USING btree ("titel");
