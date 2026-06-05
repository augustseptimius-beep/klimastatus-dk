-- Fjern dubletter opstået ved seed-kørsel ved hver container-opstart.
-- Beholder den ældste række (lavest created_at) pr. (version, kriterie_nr).
DELETE FROM "cctf_kriterie"
WHERE id NOT IN (
  SELECT DISTINCT ON (version, kriterie_nr) id
  FROM "cctf_kriterie"
  ORDER BY version, kriterie_nr, created_at ASC
);
--> statement-breakpoint
ALTER TABLE "cctf_kriterie" ADD CONSTRAINT "cctf_kriterie_version_nr_unique" UNIQUE("version","kriterie_nr");