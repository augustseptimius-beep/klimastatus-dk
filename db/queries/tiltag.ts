import { db } from '@/db';
import { tiltag, tovholderTiltag, tiltagEffekt } from '@/db/schema';
import { eq, asc, and, sql, inArray } from 'drizzle-orm';
import type { TiltagEffektInput } from '@/lib/tiltag/normaliser-effekter';

type TiltagData = {
  kommuneId: string;
  indsatsOmraadeId: string;
  titel: string;
  type: 'reduction' | 'adaptation' | 'both';
  beskrivelse?: string;
  status?: 'planned' | 'in_progress' | 'completed' | 'discontinued';
  tidsrammeStart?: string;
  tidsrammeSlut?: string;
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

export type TiltagEffekt = {
  id: string;
  kategori: string | null;
  vaerdi: number | null;
  enhed: string | null;
  beskrivelse: string | null;
  sortering: number;
};

export async function getTiltagEffekter(tiltagId: string): Promise<TiltagEffekt[]> {
  return db
    .select({
      id: tiltagEffekt.id,
      kategori: tiltagEffekt.kategori,
      vaerdi: tiltagEffekt.vaerdi,
      enhed: tiltagEffekt.enhed,
      beskrivelse: tiltagEffekt.beskrivelse,
      sortering: tiltagEffekt.sortering,
    })
    .from(tiltagEffekt)
    .where(eq(tiltagEffekt.tiltagId, tiltagId))
    .orderBy(asc(tiltagEffekt.sortering));
}

export async function setTiltagEffekter(tiltagId: string, effekter: TiltagEffektInput[]): Promise<void> {
  await db.delete(tiltagEffekt).where(eq(tiltagEffekt.tiltagId, tiltagId));
  if (effekter.length > 0) {
    await db.insert(tiltagEffekt).values(
      effekter.map((e) => ({
        tiltagId,
        kategori: e.kategori,
        vaerdi: e.vaerdi,
        enhed: e.enhed,
        beskrivelse: e.beskrivelse,
        sortering: e.sortering,
      })),
    );
  }
}

/** Sum af co2_reduktion-effekter pr. tiltag. Returnerer Map(tiltagId → sum). */
export async function getCo2SumForTiltag(tiltagIds: string[]): Promise<Map<string, number>> {
  if (tiltagIds.length === 0) return new Map();
  const rows = await db
    .select({
      tiltagId: tiltagEffekt.tiltagId,
      sum: sql<number>`coalesce(sum(${tiltagEffekt.vaerdi}), 0)`,
    })
    .from(tiltagEffekt)
    .where(and(eq(tiltagEffekt.kategori, 'co2_reduktion'), inArray(tiltagEffekt.tiltagId, tiltagIds)))
    .groupBy(tiltagEffekt.tiltagId);
  return new Map(rows.map((r) => [r.tiltagId, Number(r.sum)]));
}
