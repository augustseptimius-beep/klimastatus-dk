import { db } from '@/db';
import { cctfKriterie, cctfKriterieMapping, tiltag, indsatsOmraade, maal, indikator, kommuneIndikator, laeringspost } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
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

type MappingExecutor = Pick<typeof db, 'insert' | 'delete'>;

export type AutoMappingEntitet = 'tiltag' | 'maal' | 'indsatsomraade' | 'indikator';

/**
 * Sæt de regelbaserede kriterie-mappings for en entitet (erstatter eksisterende).
 * Kaldes ved oprettelse/redigering — se lib/cctf/auto-mapping.ts for reglerne.
 * Accepterer en transaktion, så import kan holde alt i én commit.
 */
export async function syncCctfMappings(
  entitetType: AutoMappingEntitet,
  entitetId: string,
  kriterier: number[],
  executor: MappingExecutor = db,
): Promise<void> {
  await executor.delete(cctfKriterieMapping).where(
    and(
      eq(cctfKriterieMapping.entitetType, entitetType),
      eq(cctfKriterieMapping.entitetId, entitetId),
    ),
  );
  if (kriterier.length > 0) {
    await executor
      .insert(cctfKriterieMapping)
      .values(kriterier.map((kriterieNr) => ({ entitetType, entitetId, kriterieNr })))
      .onConflictDoNothing();
  }
}

/** Fjern alle mappings for en mængde entiteter (oprydning ved sletning). */
export async function deleteCctfMappingsFor(
  entitetType: string,
  entitetIds: string[],
  executor: MappingExecutor = db,
): Promise<void> {
  if (entitetIds.length === 0) return;
  await executor.delete(cctfKriterieMapping).where(
    and(
      eq(cctfKriterieMapping.entitetType, entitetType),
      inArray(cctfKriterieMapping.entitetId, entitetIds),
    ),
  );
}

/**
 * Beregn CCTF-dækning pr. kriterie for en kommune.
 *
 * Status er bevidst binær: 'dokumenteret' (≥1 henvisning) eller 'manglende'.
 * Antallet af henvisninger siger ikke om kriteriets faktiske krav er opfyldt —
 * det må aldrig præsenteres som "komplet" over for en certificering.
 */
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
          .where(and(
            eq(indikator.id, m.entitetId),
            eq(kommuneIndikator.kommuneId, kommuneId),
            eq(kommuneIndikator.aktiv, true),
          ))
          .limit(1);
        if (row) label = `Indikator: ${row.beskrivelse}`;

      } else if (m.entitetType === 'laeringspost') {
        const [row] = await db
          .select({ observation: laeringspost.observation })
          .from(laeringspost)
          .where(and(eq(laeringspost.id, m.entitetId), eq(laeringspost.kommuneId, kommuneId)))
          .limit(1);
        if (row) label = `Læring: ${row.observation.slice(0, 60)}`;
      }

      if (label !== null) {
        checks.push({ entitetType: m.entitetType, entitetId: m.entitetId, label });
      }
    }

    results.push({
      kriterieNr: nr,
      status: checks.length === 0 ? 'manglende' : 'dokumenteret',
      checks,
    });
  }

  return results;
}
