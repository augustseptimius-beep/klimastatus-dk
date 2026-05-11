// db/queries/tovholder.ts
import { db } from '@/db';
import { tovholder, tovholderTiltag } from '@/db/schema';
import { eq, asc, and } from 'drizzle-orm';

export async function getAllTovholdere(kommuneId: string) {
  return db.query.tovholder.findMany({
    where: eq(tovholder.kommuneId, kommuneId),
    orderBy: asc(tovholder.navn),
  });
}

export async function getTovholderById(id: string) {
  return db.query.tovholder.findFirst({
    where: eq(tovholder.id, id),
  });
}

export async function createTovholder(data: {
  kommuneId: string;
  navn: string;
  email: string;
  forvaltning?: string;
}) {
  const [created] = await db.insert(tovholder).values(data).returning();
  return created;
}

export async function updateTovholder(
  id: string,
  data: Partial<{ navn: string; email: string; forvaltning: string; aktiv: boolean }>,
) {
  const [updated] = await db
    .update(tovholder)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tovholder.id, id))
    .returning();
  return updated;
}

export async function assignTiltagToTovholder(tovholderId: string, tiltagId: string) {
  const existing = await db.query.tovholderTiltag.findFirst({
    where: and(
      eq(tovholderTiltag.tovholderId, tovholderId),
      eq(tovholderTiltag.tiltagId, tiltagId),
    ),
  });
  if (existing) return existing;
  const [created] = await db.insert(tovholderTiltag).values({ tovholderId, tiltagId }).returning();
  return created;
}

export async function removeTiltagFromTovholder(tovholderId: string, tiltagId: string) {
  await db.delete(tovholderTiltag).where(
    and(
      eq(tovholderTiltag.tovholderId, tovholderId),
      eq(tovholderTiltag.tiltagId, tiltagId),
    ),
  );
}
