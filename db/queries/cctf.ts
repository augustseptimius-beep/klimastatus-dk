import { db } from '@/db';
import { cctfKriterie, cctfKriterieMapping, tiltag, indsatsOmraade, maal, indikator, kommuneIndikator } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { CctfKriterieResult, CctfCheck } from '@/lib/cctf/coverage-engine';

export type CctfKriterieRow = {
  id: string;
  version: string;
  kriterieNr: number;
  komponent: string;
  titel: string;
  beskrivelse: string;
  aktiv: boolean;
};

/** Hent alle aktive CCTF-kriterier for en given version, sorteret efter kriterie-nr. */
export async function getCctfKriterier(version = '2.5'): Promise<CctfKriterieRow[]> {
  const rows = await db
    .select({
      id: cctfKriterie.id,
      version: cctfKriterie.version,
      kriterieNr: cctfKriterie.kriterieNr,
      komponent: cctfKriterie.komponent,
      titel: cctfKriterie.titel,
      beskrivelse: cctfKriterie.beskrivelse,
      aktiv: cctfKriterie.aktiv,
    })
    .from(cctfKriterie)
    .where(and(eq(cctfKriterie.version, version), eq(cctfKriterie.aktiv, true)))
    .orderBy(cctfKriterie.kriterieNr);
  return rows;
}

/** Beregn CCTF-dækning pr. kriterie for en kommune. */
export async function getCctfDaekning(kommuneId: string): Promise<CctfKriterieResult[]> {
  // Hent alle mappings
  const mappings = await db
    .select({
      kriterieNr: cctfKriterieMapping.kriterieNr,
      entitetType: cctfKriterieMapping.entitetType,
      entitetId: cctfKriterieMapping.entitetId,
    })
    .from(cctfKriterieMapping);

  // Grupper per kriterie-nr
  const byKriterie = new Map<number, typeof mappings>();
  for (const m of mappings) {
    const existing = byKriterie.get(m.kriterieNr) ?? [];
    byKriterie.set(m.kriterieNr, [...existing, m]);
  }

  const results: CctfKriterieResult[] = [];

  for (let nr = 1; nr <= 16; nr++) {
    const rawMappings = byKriterie.get(nr) ?? [];
    const checks: CctfCheck[] = [];

    for (const m of rawMappings) {
      let label: string | null = null;

      if (m.entitetType === 'tiltag') {
        const [row] = await db
          .select({ titel: tiltag.titel })
          .from(tiltag)
          .where(and(eq(tiltag.id, m.entitetId), eq(tiltag.kommuneId, kommuneId)))
          .limit(1);
        if (row) label = row.titel;

      } else if (m.entitetType === 'maal') {
        const [row] = await db
          .select({ beskrivelse: maal.beskrivelse })
          .from(maal)
          .innerJoin(indsatsOmraade, eq(maal.indsatsOmraadeId, indsatsOmraade.id))
          .where(and(eq(maal.id, m.entitetId), eq(indsatsOmraade.kommuneId, kommuneId)))
          .limit(1);
        if (row) label = `Mål: ${row.beskrivelse.slice(0, 60)}`;

      } else if (m.entitetType === 'indsatsomraade') {
        const [row] = await db
          .select({ navn: indsatsOmraade.navn })
          .from(indsatsOmraade)
          .where(and(eq(indsatsOmraade.id, m.entitetId), eq(indsatsOmraade.kommuneId, kommuneId)))
          .limit(1);
        if (row) label = `Indsatsområde: ${row.navn}`;

      } else if (m.entitetType === 'indikator') {
        const [row] = await db
          .select({ beskrivelse: indikator.beskrivelse })
          .from(indikator)
          .innerJoin(kommuneIndikator, eq(indikator.id, kommuneIndikator.indikatorId))
          .where(and(eq(indikator.id, m.entitetId), eq(kommuneIndikator.kommuneId, kommuneId)))
          .limit(1);
        if (row) label = `Indikator: ${row.beskrivelse}`;
      }

      if (label !== null) {
        checks.push({ entitetType: m.entitetType, entitetId: m.entitetId, label });
      }
    }

    const status =
      checks.length === 0 ? 'manglende' :
      checks.length <= 2  ? 'delvis'    :
                            'komplet';

    results.push({ kriterieNr: nr, status, checks });
  }

  return results;
}
