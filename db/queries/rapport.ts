// db/queries/rapport.ts
import { db } from '@/db';
import { tovholderRapport } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export type RapportData = {
  statusImplementering?: string;
  statusBeskrivelse?: string;
  barrierer?: string;
  naesteSkrid?: string;
  effektRealiseret?: string;
  forespoergselId?: string;
};

export async function getLatestRapporterForTovholder(tovholderId: string) {
  return db.query.tovholderRapport.findMany({
    where: eq(tovholderRapport.tovholderId, tovholderId),
    orderBy: desc(tovholderRapport.createdAt),
  });
}

export async function upsertRapport(
  tovholderId: string,
  tiltagId: string,
  dato: string,
  data: RapportData,
) {
  const existing = await db.query.tovholderRapport.findFirst({
    where: and(
      eq(tovholderRapport.tovholderId, tovholderId),
      eq(tovholderRapport.tiltagId, tiltagId),
      eq(tovholderRapport.dato, dato),
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(tovholderRapport)
      .set(data)
      .where(eq(tovholderRapport.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(tovholderRapport)
    .values({ tovholderId, tiltagId, dato, ...data })
    .returning();
  return created;
}
