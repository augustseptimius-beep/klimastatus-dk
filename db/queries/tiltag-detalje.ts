import { db } from '@/db';
import { indikator, indikatorTiltag, indikatorMaaling } from '@/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

export type IndikatorMedMaaling = {
  id: string;
  niveau: 'output' | 'outcome' | 'impact';
  beskrivelse: string;
  enhed: string | null;
  senesteVaerdi: number | null;
  senesteDato: string | null;
  senesteAar: number | null;
};

/** Indikatorer koblet til tiltaget, hver med sin seneste måling (hvis nogen). */
export async function getIndikatorerForTiltag(tiltagId: string): Promise<IndikatorMedMaaling[]> {
  const inds = await db
    .select({
      id: indikator.id,
      niveau: indikator.niveau,
      beskrivelse: indikator.beskrivelse,
      enhed: indikator.enhed,
    })
    .from(indikator)
    .innerJoin(indikatorTiltag, eq(indikatorTiltag.indikatorId, indikator.id))
    .where(eq(indikatorTiltag.tiltagId, tiltagId));

  if (inds.length === 0) return [];

  const ids = inds.map((i) => i.id);
  const maalinger = await db
    .select({
      indikatorId: indikatorMaaling.indikatorId,
      vaerdi: indikatorMaaling.vaerdi,
      dato: indikatorMaaling.dato,
      aar: indikatorMaaling.aar,
    })
    .from(indikatorMaaling)
    .where(inArray(indikatorMaaling.indikatorId, ids))
    .orderBy(desc(indikatorMaaling.aar), desc(indikatorMaaling.dato));

  const senesteFor = new Map<string, { vaerdi: number; dato: string | null; aar: number | null }>();
  for (const m of maalinger) {
    if (!senesteFor.has(m.indikatorId)) {
      senesteFor.set(m.indikatorId, { vaerdi: m.vaerdi, dato: m.dato, aar: m.aar });
    }
  }

  return inds.map((i) => {
    const s = senesteFor.get(i.id);
    return {
      id: i.id,
      niveau: i.niveau as IndikatorMedMaaling['niveau'],
      beskrivelse: i.beskrivelse,
      enhed: i.enhed,
      senesteVaerdi: s?.vaerdi ?? null,
      senesteDato: s?.dato ?? null,
      senesteAar: s?.aar ?? null,
    };
  });
}
