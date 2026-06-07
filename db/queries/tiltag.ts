import { db } from '@/db';
import { tiltag, tovholderTiltag } from '@/db/schema';
import { eq, asc, and } from 'drizzle-orm';

type TiltagData = {
  kommuneId: string;
  indsatsOmraadeId: string;
  titel: string;
  type: 'reduction' | 'adaptation' | 'both';
  beskrivelse?: string;
  status?: 'planned' | 'in_progress' | 'completed' | 'discontinued';
  tidsrammeStart?: string;
  tidsrammeSlut?: string;
  forventetEffektCo2Ton?: number;
  prioriteretTiltag?: boolean;
};

export async function getAllTiltag(kommuneId: string) {
  return db.query.tiltag.findMany({
    where: eq(tiltag.kommuneId, kommuneId),
    orderBy: asc(tiltag.titel),
  });
}

export async function getTiltagById(id: string) {
  return db.query.tiltag.findFirst({
    where: eq(tiltag.id, id),
  });
}

export async function getTiltagForTovholder(tovholderId: string) {
  return db
    .select({
      id: tiltag.id,
      titel: tiltag.titel,
      indsatsOmraadeId: tiltag.indsatsOmraadeId,
      type: tiltag.type,
      status: tiltag.status,
      beskrivelse: tiltag.beskrivelse,
    })
    .from(tiltag)
    .innerJoin(
      tovholderTiltag,
      and(
        eq(tovholderTiltag.tiltagId, tiltag.id),
        eq(tovholderTiltag.tovholderId, tovholderId),
      ),
    )
    .orderBy(asc(tiltag.titel));
}

export async function createTiltag(data: TiltagData) {
  const [created] = await db.insert(tiltag).values(data).returning();
  return created;
}

export async function updateTiltag(
  id: string,
  data: Partial<Omit<TiltagData, 'kommuneId'>>,
) {
  const [updated] = await db
    .update(tiltag)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tiltag.id, id))
    .returning();
  return updated;
}

export async function getTiltagTovholdere(tiltagId: string): Promise<string[]> {
  const rows = await db
    .select({ tovholderId: tovholderTiltag.tovholderId })
    .from(tovholderTiltag)
    .where(eq(tovholderTiltag.tiltagId, tiltagId));
  return rows.map((r) => r.tovholderId);
}

export async function setTiltagTovholdere(tiltagId: string, tovholderIds: string[]): Promise<void> {
  await db.delete(tovholderTiltag).where(eq(tovholderTiltag.tiltagId, tiltagId));
  if (tovholderIds.length > 0) {
    await db.insert(tovholderTiltag).values(
      tovholderIds.map((tovholderId) => ({ tiltagId, tovholderId }))
    );
  }
}
