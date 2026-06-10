import { db } from '@/db';
import { indikatorTiltag, tiltag, indikatorMaal, maal, indsatsOmraade } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export type IndikatorKobling = {
  tilknyttedeTiltag: { id: string; titel: string }[];
  tilknyttedeMaal: { id: string; titel: string }[];
};

// Indikatorer er globale skabeloner og kan deles på tværs af kommuner —
// koblinger skal derfor altid filtreres på kommunens egne tiltag og mål.
export async function getIndikatorKobling(indikatorId: string, kommuneId: string): Promise<IndikatorKobling> {
  const tiltagRows = await db
    .select({ id: tiltag.id, titel: tiltag.titel })
    .from(indikatorTiltag)
    .innerJoin(tiltag, eq(indikatorTiltag.tiltagId, tiltag.id))
    .where(and(eq(indikatorTiltag.indikatorId, indikatorId), eq(tiltag.kommuneId, kommuneId)));

  const maalRows = await db
    .select({ id: maal.id, titel: maal.beskrivelse })
    .from(indikatorMaal)
    .innerJoin(maal, eq(indikatorMaal.maalId, maal.id))
    .innerJoin(indsatsOmraade, eq(maal.indsatsOmraadeId, indsatsOmraade.id))
    .where(and(eq(indikatorMaal.indikatorId, indikatorId), eq(indsatsOmraade.kommuneId, kommuneId)));

  return { tilknyttedeTiltag: tiltagRows, tilknyttedeMaal: maalRows };
}

export async function tilknytIndikatorTiltag(indikatorId: string, tiltagId: string): Promise<void> {
  await db.insert(indikatorTiltag).values({ indikatorId, tiltagId }).onConflictDoNothing();
}

export async function fjernIndikatorTiltag(indikatorId: string, tiltagId: string): Promise<void> {
  await db.delete(indikatorTiltag).where(
    and(eq(indikatorTiltag.indikatorId, indikatorId), eq(indikatorTiltag.tiltagId, tiltagId))
  );
}
