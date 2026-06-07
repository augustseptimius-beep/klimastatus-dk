import { db } from '@/db';
import { indsatsOmraade, tiltag } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export type IndsatsOversigt = {
  id: string;
  navn: string;
  type: string;
  antalTiltag: number;
  antalIgang: number;
  antalFaerdig: number;
}[];

export async function loadData(kommuneId: string): Promise<IndsatsOversigt> {
  const rows = await db
    .select({
      id: indsatsOmraade.id,
      navn: indsatsOmraade.navn,
      type: indsatsOmraade.type,
      antalTiltag: sql<number>`count(${tiltag.id})::int`,
      antalIgang: sql<number>`count(${tiltag.id}) filter (where ${tiltag.status} = 'in_progress')::int`,
      antalFaerdig: sql<number>`count(${tiltag.id}) filter (where ${tiltag.status} = 'completed')::int`,
    })
    .from(indsatsOmraade)
    .leftJoin(tiltag, eq(tiltag.indsatsOmraadeId, indsatsOmraade.id))
    .where(eq(indsatsOmraade.kommuneId, kommuneId))
    .groupBy(indsatsOmraade.id, indsatsOmraade.navn, indsatsOmraade.type)
    .orderBy(indsatsOmraade.navn);

  return rows;
}
