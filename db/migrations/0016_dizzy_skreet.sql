-- Fjern eventuelle dublet-mappings (beholder ældste række) før unik constraint.
DELETE FROM "cctf_kriterie_mapping"
WHERE id NOT IN (
  SELECT DISTINCT ON (entitet_type, entitet_id, kriterie_nr) id
  FROM "cctf_kriterie_mapping"
  ORDER BY entitet_type, entitet_id, kriterie_nr, created_at ASC
);
--> statement-breakpoint
ALTER TABLE "cctf_kriterie_mapping" ADD CONSTRAINT "cctf_kriterie_mapping_entitet_kriterie_unique" UNIQUE("entitet_type","entitet_id","kriterie_nr");
