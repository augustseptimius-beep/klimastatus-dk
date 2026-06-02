import { db } from '@/db';
import { monitoreringscyklus } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export type Monitoreringscyklus = typeof monitoreringscyklus.$inferSelect;

export async function ensureAarligCyklus(kommuneId: string, aar: number): Promise<Monitoreringscyklus> {
  const eksisterende = await db.query.monitoreringscyklus.findFirst({
    where: and(
      eq(monitoreringscyklus.kommuneId, kommuneId),
      eq(monitoreringscyklus.type, 'aarlig'),
      eq(monitoreringscyklus.aar, aar),
    ),
  });
  if (eksisterende) return eksisterende;

  const [oprettet] = await db
    .insert(monitoreringscyklus)
    .values({
      kommuneId,
      aar,
      type: 'aarlig',
      navn: `Årsstatus ${aar}`,
      status: 'aaben',
    })
    .onConflictDoNothing()
    .returning();

  if (oprettet) return oprettet;

  // Konflikt (en parallel skrivning vandt) — slå op igen.
  const efterKonflikt = await db.query.monitoreringscyklus.findFirst({
    where: and(
      eq(monitoreringscyklus.kommuneId, kommuneId),
      eq(monitoreringscyklus.type, 'aarlig'),
      eq(monitoreringscyklus.aar, aar),
    ),
  });
  if (!efterKonflikt) throw new Error(`Kunne ikke oprette eller finde årlig cyklus for kommune ${kommuneId}, år ${aar}`);
  return efterKonflikt;
}
