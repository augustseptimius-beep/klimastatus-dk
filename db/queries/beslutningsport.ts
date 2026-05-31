// db/queries/beslutningsport.ts
import { db } from '@/db';
import { kommuneIndikator, indikator, indikatorTemplate } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export type ForaeldreloesIndikator = {
  kommuneIndikatorId: string;
  indikatorId: string;
  titel: string;
};

/**
 * Aktive indikator-instanser der hverken er knyttet til et mål eller et
 * prioriteret tiltag. Disse flages i UI som "forældreløse" (beslutningsport).
 */
export async function getForaeldreloeseIndikatorer(
  kommuneId: string,
): Promise<ForaeldreloesIndikator[]> {
  const rows = await db
    .select({
      kommuneIndikatorId: kommuneIndikator.id,
      indikatorId: kommuneIndikator.indikatorId,
      titel: indikatorTemplate.titel,
    })
    .from(kommuneIndikator)
    .innerJoin(indikator, eq(kommuneIndikator.indikatorId, indikator.id))
    .innerJoin(indikatorTemplate, eq(kommuneIndikator.templateId, indikatorTemplate.id))
    .where(and(
      eq(kommuneIndikator.kommuneId, kommuneId),
      eq(kommuneIndikator.aktiv, true),
      sql`${kommuneIndikator.indikatorId} NOT IN (
        SELECT indikator_id FROM indikator_maal
        UNION
        SELECT it.indikator_id FROM indikator_tiltag it
          JOIN tiltag t ON it.tiltag_id = t.id
          WHERE t.prioriteret_tiltag = true
      )`,
    ));
  return rows;
}
