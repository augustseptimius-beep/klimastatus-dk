import { db } from '@/db';
import {
  selvevaluering,
  cctfKriterieMapping,
  tiltag,
  maal,
  indikator,
  indsatsOmraade,
  kommuneIndikator,
  laeringspost,
} from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { SelvevalueringData, KriterieBesvarelse, DokRef } from '@/lib/cctf/selvevaluering-types';
import { tomKriterieBesvarelse } from '@/lib/cctf/selvevaluering-types';

// ── Rene hjælpefunktioner (testbare) ─────────────────────────────────────────

/** Opret et tomt SelvevalueringData-objekt med 16 kriterier. */
export function initialiserKriterieData(cctfVersion: string): SelvevalueringData {
  return {
    cctfVersion,
    kriterier: Array.from({ length: 16 }, (_, i) => tomKriterieBesvarelse(i + 1)),
  };
}

/** Opdatér tekstfelter for ét kriterie — bevarer dokumentationshenvisninger. */
export function opdaterKriterieText(
  data: SelvevalueringData,
  kriterieNr: number,
  tekst: Pick<KriterieBesvarelse, 'hvadStaarPaa' | 'hvadOpdateres' | 'selvvurdering' | 'selvvurderingNiveau'>,
): SelvevalueringData {
  return {
    ...data,
    kriterier: data.kriterier.map(k => {
      if (k.kriterieNr !== kriterieNr) return k;
      const ny: KriterieBesvarelse = {
        ...k,
        ...tekst,
        // Al redigering kræver re-godkendelse
        status: 'redigeret',
      };
      return ny;
    }),
  };
}

/** Snapshot dokumentationshenvisninger ind i kriterieData og sæt status godkendt. */
export function godkendKriterieInData(
  data: SelvevalueringData,
  kriterieNr: number,
  dokRefs: DokRef[],
): SelvevalueringData {
  return {
    ...data,
    kriterier: data.kriterier.map(k => {
      if (k.kriterieNr !== kriterieNr) return k;
      return { ...k, status: 'godkendt', dokumentationshenvisninger: dokRefs };
    }),
  };
}

// ── DB-queries ────────────────────────────────────────────────────────────────

export type SelvevalueringRow = {
  id: string;
  kommuneId: string;
  cctfVersion: string;
  version: number;
  genereretDato: Date;
  kriterieData: SelvevalueringData;
};

/** Hent eksisterende selvevaluering for kommunen (seneste version). */
export async function getSelvevaluering(kommuneId: string): Promise<SelvevalueringRow | null> {
  const rows = await db
    .select()
    .from(selvevaluering)
    .where(eq(selvevaluering.kommuneId, kommuneId))
    .orderBy(desc(selvevaluering.version))
    .limit(1);
  if (rows.length === 0) return null;
  return {
    id: rows[0].id,
    kommuneId: rows[0].kommuneId,
    cctfVersion: rows[0].cctfVersion,
    version: rows[0].version,
    genereretDato: rows[0].genereretDato,
    kriterieData: rows[0].kriterieData as SelvevalueringData,
  };
}

/** Gem/opdatér selvevaluering. Overskriver aldrig tekstfelter hvis de ikke er med i data. */
export async function upsertSelvevaluering(
  kommuneId: string,
  data: SelvevalueringData,
): Promise<SelvevalueringRow> {
  const existing = await getSelvevaluering(kommuneId);
  if (existing) {
    const [updated] = await db
      .update(selvevaluering)
      .set({ kriterieData: data as unknown as Record<string, unknown>, cctfVersion: data.cctfVersion, genereretDato: new Date(), updatedAt: new Date() })
      .where(eq(selvevaluering.id, existing.id))
      .returning();
    return { ...existing, kriterieData: data, version: updated.version };
  }
  const [created] = await db.insert(selvevaluering).values({
    kommuneId,
    cctfVersion: data.cctfVersion,
    kriterieData: data as unknown as Record<string, unknown>,
  }).returning();
  return {
    id: created.id,
    kommuneId: created.kommuneId,
    cctfVersion: created.cctfVersion,
    version: created.version,
    genereretDato: created.genereretDato,
    kriterieData: data,
  };
}

/** Hent dokumentationshenvisninger for ét kriterie fra live mappings. */
export async function getDokumentationshenvisninger(
  kommuneId: string,
  kriterieNr: number,
): Promise<DokRef[]> {
  const mappings = await db
    .select({
      entitetType: cctfKriterieMapping.entitetType,
      entitetId: cctfKriterieMapping.entitetId,
      bemaerkning: cctfKriterieMapping.bemaerkning,
    })
    .from(cctfKriterieMapping)
    .where(eq(cctfKriterieMapping.kriterieNr, kriterieNr));

  const result: DokRef[] = [];

  for (const m of mappings) {
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
      if (row) label = `Mål: ${row.beskrivelse.slice(0, 80)}`;

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
      if (row) label = `Læringspost: ${row.observation.slice(0, 60)}`;
    }

    if (label !== null) {
      result.push({ entitetType: m.entitetType, entitetId: m.entitetId, label, bemaerkning: m.bemaerkning });
    }
  }

  return result;
}
