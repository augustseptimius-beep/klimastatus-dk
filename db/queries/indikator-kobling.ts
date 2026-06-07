import { db } from '@/db';
import { indikatorTiltag, tiltag, indikatorMaal, maal } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export type IndikatorKobling = {
  tilknyttedeTiltag: { id: string; titel: string }[];
  tilknyttedeMaal: { id: string; titel: string }[];
};

export async function getIndikatorKobling(indikatorId: string): Promise<IndikatorKobling> {
  const tiltagRows = await db
    .select({ id: tiltag.id, titel: tiltag.titel })
    .from(indikatorTiltag)
    .innerJoin(tiltag, eq(indikatorTiltag.tiltagId, tiltag.id))
    .where(eq(indikatorTiltag.indikatorId, indikatorId));

  const maalRows = await db
    .select({ id: maal.id, titel: maal.beskrivelse })
    .from(indikatorMaal)
    .innerJoin(maal, eq(indikatorMaal.maalId, maal.id))
    .where(eq(indikatorMaal.indikatorId, indikatorId));

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
