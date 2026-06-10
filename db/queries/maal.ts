import { db } from '@/db';
import { maal, indsatsOmraade } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export type ReduktionsMaal = {
  maalAar: number;
  maalVaerdi: number;
  baselineAar: number;
  baselineVaerdi: number;
  enhed: string | null;
};

/** Det primære SMART-reduktionsmål for en kommune (nyeste mål-år først). */
export async function getReduktionsMaal(kommuneId: string): Promise<ReduktionsMaal | null> {
  const rows = await db
    .select({
      maalAar: maal.maalAar,
      maalVaerdi: maal.maalVaerdi,
      baselineAar: maal.baselineAar,
      baselineVaerdi: maal.baselineVaerdi,
      enhed: maal.enhed,
    })
    .from(maal)
    .innerJoin(indsatsOmraade, eq(maal.indsatsOmraadeId, indsatsOmraade.id))
    .where(
      and(
        eq(indsatsOmraade.kommuneId, kommuneId),
        eq(maal.kategori, 'reduction'),
        eq(maal.type, 'smart'),
      ),
    )
    .orderBy(desc(maal.maalAar));

  const v = rows.find(
    (r) => r.maalAar != null && r.maalVaerdi != null && r.baselineVaerdi != null && r.baselineAar != null,
  );
  if (!v) return null;
  return {
    maalAar: v.maalAar!,
    maalVaerdi: v.maalVaerdi!,
    baselineAar: v.baselineAar!,
    baselineVaerdi: v.baselineVaerdi!,
    enhed: v.enhed,
  };
}

export type UfuldstaendigtMaal = {
  id: string;
  beskrivelse: string;
  mangler: string[];
};

/**
 * SMART-reduktionsmål der mangler baseline eller målværdi/-år og derfor
 * forsvinder tavst fra grafer (getReduktionsMaal springer dem over).
 */
export async function getUfuldstaendigeReduktionsMaal(kommuneId: string): Promise<UfuldstaendigtMaal[]> {
  const rows = await db
    .select({
      id: maal.id,
      beskrivelse: maal.beskrivelse,
      maalAar: maal.maalAar,
      maalVaerdi: maal.maalVaerdi,
      baselineAar: maal.baselineAar,
      baselineVaerdi: maal.baselineVaerdi,
    })
    .from(maal)
    .innerJoin(indsatsOmraade, eq(maal.indsatsOmraadeId, indsatsOmraade.id))
    .where(
      and(
        eq(indsatsOmraade.kommuneId, kommuneId),
        eq(maal.kategori, 'reduction'),
        eq(maal.type, 'smart'),
      ),
    );

  const result: UfuldstaendigtMaal[] = [];
  for (const r of rows) {
    const mangler: string[] = [];
    if (r.baselineVaerdi == null) mangler.push('baselineværdi');
    if (r.baselineAar == null) mangler.push('baselineår');
    if (r.maalVaerdi == null) mangler.push('målværdi');
    if (r.maalAar == null) mangler.push('målår');
    if (mangler.length > 0) result.push({ id: r.id, beskrivelse: r.beskrivelse, mangler });
  }
  return result;
}
